from rest_framework import serializers

from hotel.models import Booking

from .models import Invoice, Payment, Transaction
from .services import get_booking_amounts


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = "__all__"


class InvoiceSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField(source="guest.full_name", read_only=True)
    room_number = serializers.CharField(source="booking.room.room_number", read_only=True)
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)

    class Meta:
        model = Invoice
        fields = "__all__"


class PaymentSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField(source="guest.full_name", read_only=True)
    room_number = serializers.CharField(source="booking.room.room_number", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    transactions = TransactionSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = [
            "created_at",
            "transaction_id",
            "card_last_four",
            "paid_at",
            "guest",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


class ProcessCardSerializer(serializers.Serializer):
    booking = serializers.PrimaryKeyRelatedField(queryset=Booking.objects.all())
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    cardholder_name = serializers.CharField(max_length=100)
    card_number = serializers.CharField(max_length=19, write_only=True)
    expiry_month = serializers.CharField(max_length=2)
    expiry_year = serializers.CharField(max_length=4)
    cvv = serializers.CharField(max_length=4, write_only=True)


class ManualPaymentSerializer(serializers.Serializer):
    booking = serializers.PrimaryKeyRelatedField(queryset=Booking.objects.all())
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=Payment.PaymentMethod.choices)
    notes = serializers.CharField(required=False, allow_blank=True)


class BookingPaymentStatusSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    payment_status = serializers.CharField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    service_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    tax = serializers.DecimalField(max_digits=10, decimal_places=2)
    total = serializers.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    balance_due = serializers.DecimalField(max_digits=10, decimal_places=2)
    invoice_number = serializers.CharField(allow_null=True)


class RefundSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")
