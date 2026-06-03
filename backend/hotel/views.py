from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsAdminOrManager, IsStaffRole

from .filters import (
    BookingFilter,
    GuestFilter,
    HousekeepingFilter,
    MaintenanceFilter,
    RoomFilter,
)
from payments.models import Invoice, Payment
from payments.serializers import InvoiceSerializer, PaymentSerializer

from .models import (
    ActivityLog,
    Booking,
    Guest,
    HousekeepingTask,
    MaintenanceRequest,
    Notification,
    Room,
    Staff,
)
from .serializers import (
    ActivityLogSerializer,
    BookingSerializer,
    GuestSerializer,
    HousekeepingTaskSerializer,
    MaintenanceRequestSerializer,
    NotificationSerializer,
    RoomSerializer,
    StaffSerializer,
)
from .utils import log_activity

User = get_user_model()


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.select_related("user").all()
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManager]
    search_fields = ["user__username", "user__email", "user__first_name", "user__last_name"]
    filterset_fields = ["shift", "is_active"]


class GuestViewSet(viewsets.ModelViewSet):
    queryset = Guest.objects.all()
    serializer_class = GuestSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_class = GuestFilter
    search_fields = ["first_name", "last_name", "email", "phone", "id_document"]

    def perform_create(self, serializer):
        guest = serializer.save()
        log_activity(self.request.user, "created", "guest", guest.id, f"Guest {guest.full_name} registered")

    @action(detail=True, methods=["get"])
    def bookings(self, request, pk=None):
        guest = self.get_object()
        bookings = guest.bookings.select_related("room").all()
        return Response(BookingSerializer(bookings, many=True).data)

    @action(detail=True, methods=["get"])
    def invoices(self, request, pk=None):
        guest = self.get_object()
        invoices = Invoice.objects.filter(guest=guest).select_related("booking", "booking__room")
        payments = Payment.objects.filter(guest=guest).select_related("booking", "invoice")
        return Response({
            "invoices": InvoiceSerializer(invoices, many=True).data,
            "payments": PaymentSerializer(payments, many=True).data,
        })


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = RoomFilter
    search_fields = ["room_number", "room_type", "description"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsAdminOrManager()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        room = serializer.save()
        log_activity(self.request.user, "created", "room", room.id, f"Room {room.room_number} added")

    @action(detail=False, methods=["get"])
    def availability(self, request):
        start = request.query_params.get("start", str(date.today()))
        end = request.query_params.get("end", str(date.today() + timedelta(days=30)))
        try:
            start_date = date.fromisoformat(start)
            end_date = date.fromisoformat(end)
        except ValueError:
            return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        rooms = Room.objects.all()
        bookings = Booking.objects.filter(
            status__in=["confirmed", "checked_in", "pending"],
            check_in__lt=end_date,
            check_out__gt=start_date,
        ).select_related("room", "guest")

        calendar = []
        current = start_date
        while current <= end_date:
            day_bookings = [
                {
                    "id": b.id,
                    "room_id": b.room_id,
                    "room_number": b.room.room_number,
                    "guest": b.guest.full_name,
                    "status": b.status,
                }
                for b in bookings
                if b.check_in <= current < b.check_out
            ]
            calendar.append({"date": str(current), "bookings": day_bookings})
            current += timedelta(days=1)

        return Response({
            "rooms": RoomSerializer(rooms, many=True).data,
            "calendar": calendar,
        })


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related("guest", "room", "created_by").prefetch_related(
        "payment_records", "invoices"
    )
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_class = BookingFilter
    search_fields = ["guest__first_name", "guest__last_name", "room__room_number"]

    @action(detail=True, methods=["post"])
    def check_in(self, request, pk=None):
        booking = self.get_object()
        booking.status = Booking.Status.CHECKED_IN
        booking.room.status = Room.Status.OCCUPIED
        booking.room.save()
        booking.save()
        log_activity(request.user, "check_in", "booking", booking.id, f"Checked in {booking.guest.full_name}")
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def check_out(self, request, pk=None):
        booking = self.get_object()
        booking.status = Booking.Status.CHECKED_OUT
        booking.room.status = Room.Status.CLEANING
        booking.room.save()
        booking.save()
        HousekeepingTask.objects.create(room=booking.room, notes="Post check-out cleaning")
        log_activity(request.user, "check_out", "booking", booking.id, f"Checked out {booking.guest.full_name}")
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        booking.status = Booking.Status.CANCELLED
        if booking.room.status in (Room.Status.OCCUPIED, Room.Status.RESERVED):
            booking.room.status = Room.Status.AVAILABLE
            booking.room.save()
        booking.save()
        log_activity(request.user, "cancelled", "booking", booking.id, f"Booking #{booking.id} cancelled")
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["get"])
    def invoice(self, request, pk=None):
        booking = self.get_object()
        html = f"""
        <html><body style="font-family:Arial;padding:40px">
        <h1>Hotel Invoice</h1>
        <p><strong>Booking #:</strong> {booking.id}</p>
        <p><strong>Guest:</strong> {booking.guest.full_name}</p>
        <p><strong>Room:</strong> {booking.room.room_number} ({booking.room.room_type})</p>
        <p><strong>Stay:</strong> {booking.check_in} to {booking.check_out} ({booking.nights} nights)</p>
        <p><strong>Total:</strong> ${booking.total_amount}</p>
        <p><strong>Payment Status:</strong> {booking.payment_status}</p>
        </body></html>
        """
        response = HttpResponse(html, content_type="text/html")
        response["Content-Disposition"] = f'attachment; filename="invoice-{booking.id}.html"'
        return response

    @action(detail=False, methods=["get"])
    def calendar(self, request):
        bookings = self.get_queryset().filter(
            status__in=["confirmed", "checked_in", "pending"]
        )
        return Response(BookingSerializer(bookings, many=True).data)

    @action(detail=False, methods=["get"])
    def timeline(self, request):
        today = date.today()
        upcoming = self.get_queryset().filter(check_in__gte=today).order_by("check_in")[:20]
        active = self.get_queryset().filter(status=Booking.Status.CHECKED_IN)
        return Response({
            "upcoming": BookingSerializer(upcoming, many=True).data,
            "active": BookingSerializer(active, many=True).data,
        })


class HousekeepingTaskViewSet(viewsets.ModelViewSet):
    queryset = HousekeepingTask.objects.select_related("room", "assigned_to")
    serializer_class = HousekeepingTaskSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = HousekeepingFilter
    search_fields = ["room__room_number", "notes"]

    def get_permissions(self):
        if self.action in ("create", "destroy"):
            return [IsAuthenticated(), IsAdminOrManager()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        task = self.get_object()
        task.status = HousekeepingTask.Status.COMPLETED
        task.completed_at = timezone.now()
        task.room.status = Room.Status.AVAILABLE
        task.room.save()
        task.save()
        return Response(HousekeepingTaskSerializer(task).data)

    @action(detail=False, methods=["get"])
    def report(self, request):
        stats = HousekeepingTask.objects.values("status").annotate(count=Count("id"))
        return Response(list(stats))


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.select_related("room", "assigned_to")
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = MaintenanceFilter
    search_fields = ["title", "description", "room__room_number"]

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        req = self.get_object()
        req.status = MaintenanceRequest.Status.RESOLVED
        req.resolved_at = timezone.now()
        if req.room.status == Room.Status.MAINTENANCE:
            req.room.status = Room.Status.AVAILABLE
            req.room.save()
        req.save()
        return Response(MaintenanceRequestSerializer(req).data)

    @action(detail=False, methods=["get"])
    def logs(self, request):
        tasks = self.get_queryset().order_by("-created_at")[:50]
        return Response(MaintenanceRequestSerializer(tasks, many=True).data)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({"detail": "All notifications marked as read."})


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.select_related("user")[:100]
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]


class UserManagementViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = None
    permission_classes = [IsAuthenticated, IsAdmin]
    search_fields = ["username", "email", "first_name", "last_name"]

    def get_serializer_class(self):
        from accounts.serializers import UserSerializer
        return UserSerializer

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total_rooms = Room.objects.count()
        occupied = Room.objects.filter(status=Room.Status.OCCUPIED).count()
        available = Room.objects.filter(status=Room.Status.AVAILABLE).count()
        occupancy_rate = round((occupied / total_rooms * 100) if total_rooms else 0, 1)

        active_guests = Booking.objects.filter(status=Booking.Status.CHECKED_IN).count()
        total_revenue = Payment.objects.filter(
            payment_status=Payment.PaymentStatus.PAID
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        monthly_revenue = []
        today = date.today()
        for i in range(5, -1, -1):
            month_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1)
            rev = Payment.objects.filter(
                payment_status=Payment.PaymentStatus.PAID,
                paid_at__date__gte=month_start,
                paid_at__date__lt=month_end,
            ).aggregate(total=Sum("amount"))["total"] or 0
            monthly_revenue.append({
                "month": month_start.strftime("%b"),
                "revenue": float(rev),
            })

        booking_stats = {
            status: Booking.objects.filter(status=status).count()
            for status, _ in Booking.Status.choices
        }

        recent = ActivityLog.objects.select_related("user")[:10]

        return Response({
            "occupancy_rate": occupancy_rate,
            "total_rooms": total_rooms,
            "available_rooms": available,
            "occupied_rooms": occupied,
            "active_guests": active_guests,
            "total_revenue": float(total_revenue),
            "monthly_revenue": monthly_revenue,
            "booking_stats": booking_stats,
            "refunded_total": float(
                Payment.objects.filter(payment_status=Payment.PaymentStatus.REFUNDED)
                .aggregate(t=Sum("amount"))["t"] or Decimal("0")
            ),
            "pending_housekeeping": HousekeepingTask.objects.filter(
                status=HousekeepingTask.Status.PENDING
            ).count(),
            "open_maintenance": MaintenanceRequest.objects.filter(
                status__in=[MaintenanceRequest.Status.OPEN, MaintenanceRequest.Status.IN_PROGRESS]
            ).count(),
            "recent_activities": ActivityLogSerializer(recent, many=True).data,
            "pending_payments": Payment.objects.filter(
                payment_status=Payment.PaymentStatus.PENDING
            ).count(),
        })
