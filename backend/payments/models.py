from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent"
        PAID = "paid", "Paid"
        VOID = "void", "Void"
        REFUNDED = "refunded", "Refunded"

    booking = models.ForeignKey(
        "hotel.Booking", on_delete=models.CASCADE, related_name="invoices"
    )
    guest = models.ForeignKey(
        "hotel.Guest", on_delete=models.PROTECT, related_name="invoices"
    )
    invoice_number = models.CharField(max_length=32, unique=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SENT)
    notes = models.TextField(blank=True)
    issued_at = models.DateTimeField(default=timezone.now)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issued_at"]

    def __str__(self):
        return self.invoice_number


class Payment(models.Model):
    class PaymentMethod(models.TextChoices):
        VISA = "visa", "Visa"
        MASTERCARD = "mastercard", "MasterCard"
        CASH = "cash", "Cash"
        BANK_TRANSFER = "bank_transfer", "Bank Transfer"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    booking = models.ForeignKey(
        "hotel.Booking", on_delete=models.CASCADE, related_name="payment_records"
    )
    guest = models.ForeignKey(
        "hotel.Guest", on_delete=models.PROTECT, related_name="payment_records"
    )
    invoice = models.ForeignKey(
        Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name="payments"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.VISA
    )
    payment_status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )
    transaction_id = models.CharField(max_length=64, blank=True)
    card_last_four = models.CharField(max_length=4, blank=True)
    notes = models.TextField(blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_payments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment {self.pk} - {self.amount}"


class Transaction(models.Model):
    class TransactionType(models.TextChoices):
        CHARGE = "charge", "Charge"
        REFUND = "refund", "Refund"
        FAILURE = "failure", "Failure"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    payment = models.ForeignKey(
        Payment, on_delete=models.CASCADE, related_name="transactions"
    )
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices)
    reference = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.transaction_type} {self.reference}"
