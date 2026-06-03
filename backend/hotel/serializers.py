from django.contrib.auth import get_user_model
from rest_framework import serializers

from payments.serializers import PaymentSerializer

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
from .utils import log_activity

User = get_user_model()


class StaffSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True
    )

    class Meta:
        model = Staff
        fields = [
            "id",
            "user",
            "user_id",
            "salary",
            "shift",
            "is_active",
            "hired_at",
        ]
        read_only_fields = ["hired_at"]

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "email": obj.user.email,
            "full_name": obj.user.get_full_name() or obj.user.username,
            "role": obj.user.role,
            "phone": obj.user.phone,
            "avatar": obj.user.avatar.url if obj.user.avatar else None,
        }


class GuestSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    bookings_count = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def get_bookings_count(self, obj):
        return obj.bookings.count()


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class BookingSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField(source="guest.full_name", read_only=True)
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    room_type = serializers.CharField(source="room.room_type", read_only=True)
    nights = serializers.IntegerField(read_only=True)
    payment_records = PaymentSerializer(many=True, read_only=True)
    amount_paid = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()

    def get_amount_paid(self, obj):
        from payments.services import get_booking_amounts
        return get_booking_amounts(obj)["paid"]

    def get_balance_due(self, obj):
        from payments.services import get_booking_amounts
        return get_booking_amounts(obj)["balance_due"]

    def get_invoice_number(self, obj):
        inv = obj.invoices.exclude(status="void").order_by("-issued_at").first()
        return inv.invoice_number if inv else None

    class Meta:
        model = Booking
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "created_by"]

    def validate(self, attrs):
        check_in = attrs.get("check_in") or getattr(self.instance, "check_in", None)
        check_out = attrs.get("check_out") or getattr(self.instance, "check_out", None)
        if check_in and check_out and check_out <= check_in:
            raise serializers.ValidationError("Check-out must be after check-in.")
        return attrs

    def create(self, validated_data):
        room = validated_data["room"]
        nights = max((validated_data["check_out"] - validated_data["check_in"]).days, 1)
        if not validated_data.get("total_amount"):
            validated_data["total_amount"] = room.price * nights
        validated_data["created_by"] = self.context["request"].user
        booking = super().create(validated_data)
        if booking.status in (Booking.Status.CONFIRMED, Booking.Status.PENDING):
            booking.room.status = Room.Status.RESERVED
            booking.room.save(update_fields=["status"])
        log_activity(
            self.context["request"].user,
            "created",
            "booking",
            booking.id,
            f"Booking created for {booking.guest.full_name}",
        )
        return booking


class HousekeepingTaskSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    assigned_name = serializers.SerializerMethodField()

    class Meta:
        model = HousekeepingTask
        fields = "__all__"
        read_only_fields = ["created_at", "completed_at"]

    def get_assigned_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return None


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    assigned_name = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceRequest
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "resolved_at"]

    def get_assigned_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return None


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["created_at", "user"]


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = "__all__"

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return "System"
