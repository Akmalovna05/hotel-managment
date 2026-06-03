from django.conf import settings
from django.db.models import Q
from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from payments.models import Invoice, Payment, Transaction
from payments.receipt_builder import build_invoice_html, build_receipt_html
from payments.serializers import PaymentSerializer, TransactionSerializer
from payments.services import PaymentError, get_booking_amounts, get_or_create_invoice, process_card_payment

from .models import Booking, Guest, Room
from .public_serializers import (
    PublicBookingCreateSerializer,
    PublicCardPaymentSerializer,
    PublicCheckoutSerializer,
    PublicRoomSerializer,
)


class PublicRoomListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        rooms = Room.objects.filter(status=Room.Status.AVAILABLE).order_by("floor", "room_number")
        check_in = request.query_params.get("check_in")
        check_out = request.query_params.get("check_out")
        if check_in and check_out:
            busy_rooms = Booking.objects.filter(
                status__in=[
                    Booking.Status.PENDING,
                    Booking.Status.CONFIRMED,
                    Booking.Status.CHECKED_IN,
                ],
                check_in__lt=check_out,
                check_out__gt=check_in,
            ).values_list("room_id", flat=True)
            rooms = rooms.exclude(id__in=busy_rooms)
        return Response(PublicRoomSerializer(rooms, many=True).data)


class PublicRoomDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            room = Room.objects.get(pk=pk)
        except Room.DoesNotExist:
            return Response({"detail": "Room not found."}, status=404)
        return Response(PublicRoomSerializer(room).data)


class PublicBookingCreateView(APIView):
    """Create a pending online booking and return checkout reference."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PublicBookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        guest_data = data["guest"]
        room = data["room"]
        nights = max((data["check_out"] - data["check_in"]).days, 1)
        subtotal = room.price * nights

        guest, _ = Guest.objects.get_or_create(
            email=guest_data["email"].lower(),
            defaults={
                "first_name": guest_data["first_name"],
                "last_name": guest_data["last_name"],
                "phone": guest_data["phone"],
                "nationality": guest_data.get("nationality", ""),
            },
        )
        if guest.first_name != guest_data["first_name"] or guest.last_name != guest_data["last_name"]:
            guest.first_name = guest_data["first_name"]
            guest.last_name = guest_data["last_name"]
            guest.phone = guest_data["phone"]
            guest.save(update_fields=["first_name", "last_name", "phone"])

        booking = Booking.objects.create(
            guest=guest,
            room=room,
            check_in=data["check_in"],
            check_out=data["check_out"],
            guests_count=data["guests_count"],
            status=Booking.Status.PENDING,
            payment_status=Booking.PaymentStatus.PENDING,
            total_amount=subtotal,
            is_online_booking=True,
            special_requests=data.get("special_requests", ""),
        )
        room.status = Room.Status.RESERVED
        room.save(update_fields=["status"])
        get_or_create_invoice(booking)

        amounts = get_booking_amounts(booking)
        return Response(
            {
                "booking_id": booking.id,
                "booking_reference": _booking_reference(booking),
                "checkout_reference": str(booking.checkout_reference),
                "checkout_url": f"{settings.FRONTEND_URL}/checkout/{booking.checkout_reference}",
                "status": booking.status,
                "payment_status": booking.payment_status,
                "subtotal": amounts["subtotal"],
                "service_fee": amounts["service_fee"],
                "tax": amounts["tax"],
                "total": amounts["total"],
                "balance_due": amounts["balance_due"],
            },
            status=status.HTTP_201_CREATED,
        )


def _get_booking_by_reference(reference):
    try:
        return Booking.objects.select_related("guest", "room").get(
            checkout_reference=reference
        )
    except (Booking.DoesNotExist, ValueError):
        return None


def _booking_reference(booking: Booking) -> str:
    ref = str(booking.checkout_reference).replace("-", "").upper()[:8]
    return f"HOT-{ref}"


def _checkout_payload(booking: Booking) -> dict:
    amounts = get_booking_amounts(booking)
    invoice = booking.invoices.exclude(status=Invoice.Status.VOID).order_by("-issued_at").first()
    return {
        "checkout_reference": booking.checkout_reference,
        "booking_id": booking.id,
        "booking_reference": _booking_reference(booking),
        "guest_name": booking.guest.full_name,
        "guest_email": booking.guest.email,
        "guest_phone": booking.guest.phone,
        "room_number": booking.room.room_number,
        "room_type": booking.room.room_type,
        "check_in": booking.check_in,
        "check_out": booking.check_out,
        "nights": booking.nights,
        "guests_count": booking.guests_count,
        "booking_status": booking.status,
        "payment_status": booking.payment_status,
        "subtotal": amounts["subtotal"],
        "service_fee": amounts["service_fee"],
        "tax": amounts["tax"],
        "total": amounts["total"],
        "balance_due": amounts["balance_due"],
        "invoice_number": invoice.invoice_number if invoice else None,
    }


class PublicCheckoutView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, reference):
        booking = _get_booking_by_reference(reference)
        if not booking:
            return Response({"detail": "Booking not found."}, status=404)
        if booking.status == Booking.Status.CANCELLED:
            return Response({"detail": "Booking was cancelled."}, status=410)

        return Response(PublicCheckoutSerializer(_checkout_payload(booking)).data)


class PublicPayView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PublicCardPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ref = serializer.validated_data["checkout_reference"]
        booking = _get_booking_by_reference(ref)
        if not booking:
            return Response({"detail": "Booking not found."}, status=404)
        if booking.status not in (Booking.Status.PENDING, Booking.Status.CONFIRMED):
            return Response({"detail": "This booking cannot be paid."}, status=400)
        if booking.payment_status == Booking.PaymentStatus.PAID:
            return Response(
                {
                    "success": True,
                    "detail": "Already paid.",
                    "payment": None,
                    "booking_status": booking.status,
                    "confirmation_url": f"/booking/success/{ref}",
                }
            )

        amounts = get_booking_amounts(booking)
        try:
            payment, success = process_card_payment(
                booking=booking,
                amount=amounts["balance_due"],
                cardholder_name=serializer.validated_data["cardholder_name"],
                card_number=serializer.validated_data["card_number"],
                expiry_month=serializer.validated_data["expiry_month"],
                expiry_year=serializer.validated_data["expiry_year"],
                cvv=serializer.validated_data["cvv"],
                user=None,
            )
        except PaymentError as exc:
            return Response(
                {"success": False, "detail": exc.message, "code": exc.code},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.refresh_from_db()
        return Response(
            {
                "success": success,
                "detail": "Payment successful. Your booking is confirmed."
                if success
                else payment.notes,
                "payment": PaymentSerializer(payment).data,
                "booking_status": booking.status,
                "payment_status": booking.payment_status,
                "confirmation_url": f"/booking/success/{ref}" if success else f"/booking/failed/{ref}",
            },
            status=status.HTTP_200_OK if success else status.HTTP_402_PAYMENT_REQUIRED,
        )


class PublicBookingConfirmationView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, reference):
        booking = _get_booking_by_reference(reference)
        if not booking:
            return Response({"detail": "Not found."}, status=404)

        amounts = get_booking_amounts(booking)
        invoice = booking.invoices.order_by("-issued_at").first()
        payment = (
            booking.payment_records.filter(payment_status=Payment.PaymentStatus.PAID)
            .order_by("-paid_at")
            .first()
        )
        return Response(
            {
                "checkout_reference": str(booking.checkout_reference),
                "booking_id": booking.id,
                "booking_reference": _booking_reference(booking),
                "status": booking.status,
                "payment_status": booking.payment_status,
                "guest_name": booking.guest.full_name,
                "guest_email": booking.guest.email,
                "guest_phone": booking.guest.phone,
                "room_number": booking.room.room_number,
                "room_type": booking.room.room_type,
                "check_in": booking.check_in,
                "check_out": booking.check_out,
                "nights": booking.nights,
                "guests_count": booking.guests_count,
                "subtotal": amounts["subtotal"],
                "service_fee": amounts["service_fee"],
                "tax": amounts["tax"],
                "total": amounts["total"],
                "invoice_number": invoice.invoice_number if invoice else None,
                "invoice_id": invoice.id if invoice else None,
                "payment_id": payment.id if payment else None,
                "transaction_id": payment.transaction_id if payment else None,
                "payment_method": payment.payment_method if payment else None,
                "card_last_four": payment.card_last_four if payment else None,
                "paid_at": payment.paid_at if payment else None,
            }
        )


class PublicPaymentHistoryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, reference):
        booking = _get_booking_by_reference(reference)
        if not booking:
            return Response({"detail": "Not found."}, status=404)
        payments = booking.payment_records.order_by("-created_at")
        transactions = Transaction.objects.filter(payment__booking=booking).order_by("-created_at")
        return Response(
            {
                "booking_reference": _booking_reference(booking),
                "payments": PaymentSerializer(payments, many=True).data,
                "transactions": TransactionSerializer(transactions, many=True).data,
            }
        )


class PublicReceiptDownloadView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, reference):
        booking = _get_booking_by_reference(reference)
        if not booking:
            return Response({"detail": "Not found."}, status=404)
        payment = (
            booking.payment_records.filter(payment_status=Payment.PaymentStatus.PAID)
            .order_by("-paid_at")
            .first()
        )
        if not payment:
            return Response({"detail": "No paid receipt available."}, status=404)
        html = build_receipt_html(payment, booking)
        response = HttpResponse(html, content_type="text/html")
        response["Content-Disposition"] = (
            f'attachment; filename="receipt-{_booking_reference(booking)}.html"'
        )
        return response


class PublicInvoiceDownloadView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, reference):
        booking = _get_booking_by_reference(reference)
        if not booking:
            return Response({"detail": "Not found."}, status=404)
        invoice = booking.invoices.exclude(status=Invoice.Status.VOID).order_by("-issued_at").first()
        if not invoice:
            return Response({"detail": "Invoice not found."}, status=404)
        html = build_invoice_html(invoice, booking)
        response = HttpResponse(html, content_type="text/html")
        response["Content-Disposition"] = (
            f'attachment; filename="invoice-{invoice.invoice_number}.html"'
        )
        return response
