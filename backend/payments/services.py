"""Payment workflow: invoices, charges, refunds, booking sync."""
import re
import uuid
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from hotel.models import Booking

from .models import Invoice, Payment, Transaction

TAX_RATE = Decimal("0.10")
SERVICE_FEE_RATE = Decimal("0.05")


class PaymentError(Exception):
    def __init__(self, message, code="payment_error"):
        self.message = message
        self.code = code
        super().__init__(message)


def _digits_only(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def luhn_check(card_number: str) -> bool:
    digits = _digits_only(card_number)
    if len(digits) < 13 or len(digits) > 19:
        return False
    total = 0
    reverse = digits[::-1]
    for i, d in enumerate(reverse):
        n = int(d)
        if i % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0


def detect_card_brand(digits: str) -> str:
    if digits.startswith("4"):
        return Payment.PaymentMethod.VISA
    if digits.startswith("5") or digits.startswith("2"):
        return Payment.PaymentMethod.MASTERCARD
    raise PaymentError("Only Visa and MasterCard are accepted in sandbox mode.")


def validate_card(
    cardholder_name: str,
    card_number: str,
    expiry_month: str,
    expiry_year: str,
    cvv: str,
) -> tuple[str, str]:
    name = (cardholder_name or "").strip()
    if len(name) < 2:
        raise PaymentError("Cardholder name is required.")

    digits = _digits_only(card_number)
    brand = detect_card_brand(digits)
    if not luhn_check(digits):
        raise PaymentError("Invalid card number.")

    cvv_digits = _digits_only(cvv)
    if len(cvv_digits) not in (3, 4):
        raise PaymentError("CVV must be 3 or 4 digits.")

    try:
        month = int(expiry_month)
        year = int(expiry_year) if len(str(expiry_year)) == 4 else int(f"20{expiry_year}")
    except (TypeError, ValueError):
        raise PaymentError("Invalid expiry date.")

    if month < 1 or month > 12:
        raise PaymentError("Invalid expiry month.")

    today = date.today()
    if year < today.year or (year == today.year and month < today.month):
        raise PaymentError("Card has expired.")

    return digits, brand


def _sandbox_decline(digits: str, cvv: str) -> str | None:
    if digits.endswith("0000"):
        return "Card declined (sandbox: ends in 0000)."
    if _digits_only(cvv) == "000":
        return "CVV check failed (sandbox: 000)."
    if digits == "4000000000000002":
        return "Insufficient funds (sandbox test card)."
    return None


def generate_invoice_number() -> str:
    prefix = timezone.now().strftime("INV-%Y%m%d")
    last = (
        Invoice.objects.filter(invoice_number__startswith=prefix)
        .order_by("-invoice_number")
        .first()
    )
    seq = 1
    if last:
        try:
            seq = int(last.invoice_number.split("-")[-1]) + 1
        except ValueError:
            seq = Invoice.objects.count() + 1
    return f"{prefix}-{seq:04d}"


def get_booking_amounts(booking: Booking) -> dict:
    subtotal = Decimal(str(booking.total_amount))
    service_fee = (subtotal * SERVICE_FEE_RATE).quantize(Decimal("0.01"))
    tax = ((subtotal + service_fee) * TAX_RATE).quantize(Decimal("0.01"))
    total = subtotal + service_fee + tax
    paid = booking.payment_records.filter(
        payment_status=Payment.PaymentStatus.PAID
    ).aggregate(s=Sum("amount"))["s"] or Decimal("0")
    return {
        "subtotal": subtotal,
        "service_fee": service_fee,
        "tax": tax,
        "total": total,
        "paid": paid,
        "balance_due": max(total - paid, Decimal("0")),
    }


def get_or_create_invoice(booking: Booking) -> Invoice:
    invoice = booking.invoices.exclude(status=Invoice.Status.VOID).order_by("-issued_at").first()
    if invoice:
        return invoice

    amounts = get_booking_amounts(booking)
    return Invoice.objects.create(
        booking=booking,
        guest=booking.guest,
        invoice_number=generate_invoice_number(),
        subtotal=amounts["subtotal"] + amounts["service_fee"],
        tax=amounts["tax"],
        total=amounts["total"],
        status=Invoice.Status.SENT,
        due_date=booking.check_in,
    )


def sync_booking_payment_status(booking: Booking):
    amounts = get_booking_amounts(booking)
    if amounts["balance_due"] <= 0 and amounts["paid"] > 0:
        booking.payment_status = Booking.PaymentStatus.PAID
    elif amounts["paid"] > 0:
        booking.payment_status = Booking.PaymentStatus.PARTIAL
    elif booking.payment_records.filter(payment_status=Payment.PaymentStatus.REFUNDED).exists():
        booking.payment_status = Booking.PaymentStatus.REFUNDED
    else:
        booking.payment_status = Booking.PaymentStatus.PENDING
    booking.save(update_fields=["payment_status"])

    invoice = booking.invoices.exclude(status=Invoice.Status.VOID).order_by("-issued_at").first()
    if invoice:
        if amounts["balance_due"] <= 0:
            invoice.status = Invoice.Status.PAID
        elif amounts["paid"] > 0:
            invoice.status = Invoice.Status.SENT
        invoice.save(update_fields=["status"])


def _create_transaction(payment: Payment, txn_type: str, status: str, description: str):
    return Transaction.objects.create(
        payment=payment,
        transaction_type=txn_type,
        amount=payment.amount,
        status=status,
        reference=payment.transaction_id or f"TXN-{payment.pk}",
        description=description,
    )


@transaction.atomic
def record_manual_payment(
    booking: Booking,
    amount: Decimal,
    payment_method: str,
    user=None,
    notes: str = "",
) -> Payment:
    if payment_method not in Payment.PaymentMethod.values:
        raise PaymentError("Invalid payment method.")

    amounts = get_booking_amounts(booking)
    amount = Decimal(str(amount))
    if amount <= 0:
        raise PaymentError("Amount must be greater than zero.")
    if amount > amounts["balance_due"]:
        raise PaymentError(f"Amount exceeds balance due ({amounts['balance_due']}).")

    invoice = get_or_create_invoice(booking)
    tax_portion = (amount * TAX_RATE / (1 + TAX_RATE)).quantize(Decimal("0.01"))
    txn_id = f"txn_{uuid.uuid4().hex[:12]}"

    payment = Payment.objects.create(
        booking=booking,
        guest=booking.guest,
        invoice=invoice,
        amount=amount,
        tax=tax_portion,
        payment_method=payment_method,
        payment_status=Payment.PaymentStatus.PAID,
        transaction_id=txn_id,
        notes=notes or f"{payment_method} payment",
        paid_at=timezone.now(),
        created_by=user,
    )
    _create_transaction(
        payment,
        Transaction.TransactionType.CHARGE,
        Transaction.Status.COMPLETED,
        f"{payment_method} payment recorded",
    )
    sync_booking_payment_status(booking)
    confirm_booking_after_payment(booking)
    return payment


@transaction.atomic
def process_card_payment(
    booking: Booking,
    amount: Decimal,
    cardholder_name: str,
    card_number: str,
    expiry_month: str,
    expiry_year: str,
    cvv: str,
    user=None,
) -> tuple[Payment, bool]:
    digits, brand = validate_card(
        cardholder_name, card_number, expiry_month, expiry_year, cvv
    )
    amount = Decimal(str(amount))
    amounts = get_booking_amounts(booking)
    if amount <= 0:
        raise PaymentError("Amount must be greater than zero.")
    if amount > amounts["balance_due"]:
        raise PaymentError(
            f"Amount exceeds balance due ({amounts['balance_due']}).",
            code="amount_exceeds_balance",
        )

    invoice = get_or_create_invoice(booking)
    tax_portion = (amount * TAX_RATE / (1 + TAX_RATE)).quantize(Decimal("0.01"))
    txn_id = f"txn_{uuid.uuid4().hex[:12]}"
    last_four = digits[-4:]
    decline = _sandbox_decline(digits, cvv)

    payment = Payment.objects.create(
        booking=booking,
        guest=booking.guest,
        invoice=invoice,
        amount=amount,
        tax=tax_portion,
        payment_method=brand,
        payment_status=Payment.PaymentStatus.PROCESSING,
        transaction_id=txn_id,
        card_last_four=last_four,
        notes=f"Processing card payment for {cardholder_name.strip()}",
        created_by=user,
    )
    txn = _create_transaction(
        payment,
        Transaction.TransactionType.CHARGE,
        Transaction.Status.PROCESSING,
        "Verifying card with payment network (sandbox)",
    )

    if decline:
        payment.payment_status = Payment.PaymentStatus.FAILED
        payment.notes = decline
        payment.save(update_fields=["payment_status", "notes"])
        txn.status = Transaction.Status.FAILED
        txn.transaction_type = Transaction.TransactionType.FAILURE
        txn.description = decline
        txn.save(update_fields=["status", "transaction_type", "description"])
        return payment, False

    payment.payment_status = Payment.PaymentStatus.PAID
    payment.notes = f"Card payment by {cardholder_name.strip()}"
    payment.paid_at = timezone.now()
    payment.save(update_fields=["payment_status", "notes", "paid_at"])
    txn.status = Transaction.Status.COMPLETED
    txn.description = f"{brand} charge successful — authorization approved"
    txn.save(update_fields=["status", "description"])
    sync_booking_payment_status(booking)
    confirm_booking_after_payment(booking)
    return payment, True


def confirm_booking_after_payment(booking: Booking):
    """Confirm online bookings once payment is fully settled."""
    amounts = get_booking_amounts(booking)
    if amounts["balance_due"] > 0:
        return
    if booking.status == Booking.Status.PENDING and booking.is_online_booking:
        booking.status = Booking.Status.CONFIRMED
        booking.save(update_fields=["status"])
    invoice = booking.invoices.exclude(status=Invoice.Status.VOID).order_by("-issued_at").first()
    if invoice and invoice.status != Invoice.Status.PAID:
        invoice.status = Invoice.Status.PAID
        invoice.save(update_fields=["status"])


@transaction.atomic
def refund_payment(payment: Payment, user=None, reason: str = "") -> Payment:
    if payment.payment_status != Payment.PaymentStatus.PAID:
        raise PaymentError("Only paid payments can be refunded.")

    payment.payment_status = Payment.PaymentStatus.REFUNDED
    payment.notes = f"{payment.notes}\nRefund: {reason}".strip()
    payment.save(update_fields=["payment_status", "notes"])

    txn_id = f"ref_{uuid.uuid4().hex[:12]}"
    Transaction.objects.create(
        payment=payment,
        transaction_type=Transaction.TransactionType.REFUND,
        amount=payment.amount,
        status=Transaction.Status.COMPLETED,
        reference=txn_id,
        description=reason or "Payment refunded",
    )

    booking = payment.booking
    sync_booking_payment_status(booking)
    invoice = payment.invoice
    if invoice:
        invoice.status = Invoice.Status.REFUNDED
        invoice.save(update_fields=["status"])
    return payment
