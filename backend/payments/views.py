from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrManager, IsStaffRole
from hotel.models import Booking
from hotel.utils import log_activity

from .models import Invoice, Payment, Transaction
from .serializers import (
    BookingPaymentStatusSerializer,
    InvoiceSerializer,
    ManualPaymentSerializer,
    PaymentSerializer,
    ProcessCardSerializer,
    RefundSerializer,
    TransactionSerializer,
)
from .services import (
    PaymentError,
    get_booking_amounts,
    get_or_create_invoice,
    process_card_payment,
    record_manual_payment,
    refund_payment,
)


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("booking", "guest", "booking__room")
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["status", "guest", "booking"]
    search_fields = ["invoice_number", "guest__first_name", "guest__last_name"]

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        invoice = self.get_object()
        b = invoice.booking
        html = f"""
        <html><body style="font-family:Arial,sans-serif;padding:40px;max-width:700px">
        <h1 style="color:#0369a1">HotelOS Invoice</h1>
        <p><strong>Invoice #:</strong> {invoice.invoice_number}</p>
        <p><strong>Date:</strong> {invoice.issued_at.strftime('%Y-%m-%d')}</p>
        <hr/>
        <p><strong>Guest:</strong> {invoice.guest.full_name}</p>
        <p><strong>Booking #:</strong> {b.id}</p>
        <p><strong>Room:</strong> {b.room.room_number} ({b.room.room_type})</p>
        <p><strong>Stay:</strong> {b.check_in} to {b.check_out}</p>
        <hr/>
        <table width="100%" cellpadding="8">
        <tr><td>Subtotal</td><td align="right">${invoice.subtotal}</td></tr>
        <tr><td>Tax</td><td align="right">${invoice.tax}</td></tr>
        <tr style="font-weight:bold"><td>Total</td><td align="right">${invoice.total}</td></tr>
        </table>
        <p style="margin-top:24px"><strong>Status:</strong> {invoice.status}</p>
        </body></html>
        """
        response = HttpResponse(html, content_type="text/html")
        response["Content-Disposition"] = f'attachment; filename="{invoice.invoice_number}.html"'
        return response

    @action(detail=False, methods=["post"])
    def generate(self, request):
        booking_id = request.data.get("booking")
        if not booking_id:
            return Response({"detail": "booking is required."}, status=400)
        try:
            booking = Booking.objects.get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response({"detail": "Booking not found."}, status=404)
        invoice = get_or_create_invoice(booking)
        return Response(InvoiceSerializer(invoice).data, status=201)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related(
        "booking", "guest", "invoice", "booking__room", "created_by"
    ).prefetch_related("transactions")
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["payment_status", "payment_method", "booking", "guest", "invoice"]
    search_fields = [
        "transaction_id",
        "guest__first_name",
        "guest__last_name",
        "invoice__invoice_number",
    ]

    def create(self, request, *args, **kwargs):
        serializer = ManualPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment = record_manual_payment(
                booking=serializer.validated_data["booking"],
                amount=serializer.validated_data["amount"],
                payment_method=serializer.validated_data["payment_method"],
                user=request.user,
                notes=serializer.validated_data.get("notes", ""),
            )
        except PaymentError as exc:
            return Response({"detail": exc.message}, status=400)
        return Response(PaymentSerializer(payment).data, status=201)

    @action(detail=False, methods=["post"])
    def process_card(self, request):
        serializer = ProcessCardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.validated_data["booking"]
        try:
            payment, success = process_card_payment(
                booking=booking,
                amount=serializer.validated_data["amount"],
                cardholder_name=serializer.validated_data["cardholder_name"],
                card_number=serializer.validated_data["card_number"],
                expiry_month=serializer.validated_data["expiry_month"],
                expiry_year=serializer.validated_data["expiry_year"],
                cvv=serializer.validated_data["cvv"],
                user=request.user,
            )
        except PaymentError as exc:
            return Response(
                {"success": False, "detail": exc.message, "code": exc.code},
                status=status.HTTP_400_BAD_REQUEST,
            )

        log_activity(
            request.user,
            "paid" if success else "payment_failed",
            "payment",
            payment.id,
            f"Card payment {'success' if success else 'failed'} ${payment.amount}",
        )
        return Response(
            {
                "success": success,
                "payment": PaymentSerializer(payment).data,
                "detail": "Payment successful." if success else payment.notes,
            },
            status=status.HTTP_200_OK if success else status.HTTP_402_PAYMENT_REQUIRED,
        )

    @action(detail=False, methods=["post"])
    def mark_paid(self, request):
        serializer = ManualPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment = record_manual_payment(
                booking=serializer.validated_data["booking"],
                amount=serializer.validated_data["amount"],
                payment_method=serializer.validated_data["payment_method"],
                user=request.user,
                notes=serializer.validated_data.get("notes", "Marked as paid"),
            )
        except PaymentError as exc:
            return Response({"detail": exc.message}, status=400)

        log_activity(
            request.user, "paid", "payment", payment.id, f"Manual payment ${payment.amount}"
        )
        return Response(PaymentSerializer(payment).data, status=201)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdminOrManager])
    def refund(self, request, pk=None):
        payment = self.get_object()
        serializer = RefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            refund_payment(payment, user=request.user, reason=serializer.validated_data.get("reason", ""))
        except PaymentError as exc:
            return Response({"detail": exc.message}, status=400)

        log_activity(request.user, "refund", "payment", payment.id, f"Refunded ${payment.amount}")
        return Response(PaymentSerializer(payment).data)

    @action(detail=True, methods=["get"])
    def receipt(self, request, pk=None):
        from .receipt_builder import build_receipt_html

        payment = self.get_object()
        html = build_receipt_html(payment)
        response = HttpResponse(html, content_type="text/html")
        response["Content-Disposition"] = f'attachment; filename="receipt-{payment.id}.html"'
        return response

    @action(detail=False, methods=["get"])
    def history(self, request):
        qs = self.filter_queryset(self.get_queryset())[:100]
        return Response(PaymentSerializer(qs, many=True).data)


class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Transaction.objects.select_related("payment", "payment__guest")
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["transaction_type", "status", "payment"]


class PaymentAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, IsStaffRole]

    def get(self, request):
        paid_qs = Payment.objects.filter(payment_status=Payment.PaymentStatus.PAID)
        total_revenue = paid_qs.aggregate(t=Sum("amount"))["t"] or Decimal("0")
        pending_count = Payment.objects.filter(
            payment_status=Payment.PaymentStatus.PENDING
        ).count()
        failed_count = Payment.objects.filter(
            payment_status=Payment.PaymentStatus.FAILED
        ).count()
        refunded_total = Payment.objects.filter(
            payment_status=Payment.PaymentStatus.REFUNDED
        ).aggregate(t=Sum("amount"))["t"] or Decimal("0")

        monthly = []
        today = timezone.now().date()
        for i in range(5, -1, -1):
            month_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            if i > 0:
                month_end = (month_start + timedelta(days=32)).replace(day=1)
            else:
                month_end = today + timedelta(days=1)
            rev = paid_qs.filter(
                paid_at__date__gte=month_start,
                paid_at__date__lt=month_end,
            ).aggregate(t=Sum("amount"))["t"] or 0
            monthly.append({"month": month_start.strftime("%b"), "revenue": float(rev)})

        by_method = (
            paid_qs.values("payment_method")
            .annotate(count=Count("id"), total=Sum("amount"))
            .order_by("-total")
        )

        return Response({
            "total_revenue": total_revenue,
            "pending_payments": pending_count,
            "failed_payments": failed_count,
            "refunded_total": refunded_total,
            "monthly_revenue": monthly,
            "revenue_by_method": list(by_method),
            "total_invoices": Invoice.objects.count(),
            "paid_invoices": Invoice.objects.filter(status=Invoice.Status.PAID).count(),
        })


class BookingPaymentStatusView(APIView):
    permission_classes = [IsAuthenticated, IsStaffRole]

    def get(self, request, booking_id):
        try:
            booking = Booking.objects.select_related("guest", "room").get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        amounts = get_booking_amounts(booking)
        invoice = booking.invoices.exclude(status=Invoice.Status.VOID).order_by("-issued_at").first()
        data = {
            "booking_id": booking.id,
            "payment_status": booking.payment_status,
            "subtotal": amounts["subtotal"],
            "service_fee": amounts["service_fee"],
            "tax": amounts["tax"],
            "total": amounts["total"],
            "amount_paid": amounts["paid"],
            "balance_due": amounts["balance_due"],
            "invoice_number": invoice.invoice_number if invoice else None,
        }
        return Response(BookingPaymentStatusSerializer(data).data)
