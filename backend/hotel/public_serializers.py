from rest_framework import serializers

from .models import Booking, Guest, Room


class PublicRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = [
            "id",
            "room_number",
            "room_type",
            "price",
            "floor",
            "capacity",
            "amenities",
            "description",
            "status",
        ]


class PublicGuestSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    nationality = serializers.CharField(required=False, allow_blank=True, default="")


class PublicBookingCreateSerializer(serializers.Serializer):
    room_id = serializers.IntegerField()
    check_in = serializers.DateField()
    check_out = serializers.DateField()
    guests_count = serializers.IntegerField(min_value=1, default=1)
    special_requests = serializers.CharField(required=False, allow_blank=True, default="")
    guest = PublicGuestSerializer()

    def validate(self, attrs):
        if attrs["check_out"] <= attrs["check_in"]:
            raise serializers.ValidationError("Check-out must be after check-in.")
        try:
            room = Room.objects.get(pk=attrs["room_id"])
        except Room.DoesNotExist:
            raise serializers.ValidationError({"room_id": "Room not found."})
        if room.status not in (Room.Status.AVAILABLE, Room.Status.RESERVED):
            raise serializers.ValidationError({"room_id": "Room is not available."})

        overlapping = Booking.objects.filter(
            room=room,
            status__in=[
                Booking.Status.PENDING,
                Booking.Status.CONFIRMED,
                Booking.Status.CHECKED_IN,
            ],
            check_in__lt=attrs["check_out"],
            check_out__gt=attrs["check_in"],
        ).exists()
        if overlapping:
            raise serializers.ValidationError("Room is not available for these dates.")

        attrs["room"] = room
        return attrs


class PublicCheckoutSerializer(serializers.Serializer):
    checkout_reference = serializers.UUIDField()
    booking_id = serializers.IntegerField()
    booking_reference = serializers.CharField()
    guest_name = serializers.CharField()
    guest_email = serializers.EmailField()
    guest_phone = serializers.CharField()
    room_number = serializers.CharField()
    room_type = serializers.CharField()
    check_in = serializers.DateField()
    check_out = serializers.DateField()
    nights = serializers.IntegerField()
    guests_count = serializers.IntegerField()
    booking_status = serializers.CharField()
    payment_status = serializers.CharField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    service_fee = serializers.DecimalField(max_digits=10, decimal_places=2)
    tax = serializers.DecimalField(max_digits=10, decimal_places=2)
    total = serializers.DecimalField(max_digits=10, decimal_places=2)
    balance_due = serializers.DecimalField(max_digits=10, decimal_places=2)
    invoice_number = serializers.CharField(allow_null=True)


class PublicCardPaymentSerializer(serializers.Serializer):
    checkout_reference = serializers.UUIDField()
    cardholder_name = serializers.CharField(max_length=100)
    card_number = serializers.CharField(max_length=19, write_only=True)
    expiry_month = serializers.CharField(max_length=2)
    expiry_year = serializers.CharField(max_length=4)
    cvv = serializers.CharField(max_length=4, write_only=True)
