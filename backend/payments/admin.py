from django.contrib import admin

from .models import Invoice, Payment, Transaction


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "guest", "booking", "total", "status", "issued_at")
    list_filter = ("status",)
    search_fields = ("invoice_number", "guest__first_name", "guest__last_name")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "guest",
        "amount",
        "payment_method",
        "payment_status",
        "transaction_id",
        "paid_at",
    )
    list_filter = ("payment_status", "payment_method")
    search_fields = ("transaction_id", "guest__first_name")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("reference", "payment", "transaction_type", "amount", "status", "created_at")
    list_filter = ("transaction_type", "status")
