"""HTML receipt and invoice documents for download (demo)."""
from django.utils import timezone


def _brand_label(method: str) -> str:
    return {"visa": "Visa", "mastercard": "MasterCard"}.get(method, method.replace("_", " ").title())


def build_receipt_html(payment, booking=None) -> str:
    booking = booking or payment.booking
    guest = payment.guest
    card = f"•••• {payment.card_last_four}" if payment.card_last_four else "—"
    paid = payment.paid_at or payment.created_at
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt {payment.transaction_id}</title>
<style>
body{{font-family:Segoe UI,Arial,sans-serif;margin:0;background:#f1f5f9}}
.wrap{{max-width:640px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden}}
.hdr{{background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:32px}}
.hdr h1{{margin:0;font-size:24px}}
.meta{{padding:28px}}
.row{{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px}}
.total{{font-size:20px;font-weight:700;color:#2563eb}}
.badge{{display:inline-block;padding:4px 12px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:600}}
.ft{{padding:20px 28px;background:#f8fafc;font-size:12px;color:#64748b}}
</style></head><body>
<div class="wrap">
<div class="hdr"><h1>HotelOS</h1><p>Payment Receipt · Demo</p></div>
<div class="meta">
<p><span class="badge">{payment.payment_status.upper()}</span></p>
<div class="row"><span>Transaction ID</span><strong>{payment.transaction_id}</strong></div>
<div class="row"><span>Receipt #</span><strong>PAY-{payment.id:06d}</strong></div>
<div class="row"><span>Guest</span><strong>{guest.full_name}</strong></div>
<div class="row"><span>Room</span><strong>{booking.room.room_number} · {booking.room.room_type}</strong></div>
<div class="row"><span>Stay</span><strong>{booking.check_in} → {booking.check_out}</strong></div>
<div class="row"><span>Method</span><strong>{_brand_label(payment.payment_method)}</strong></div>
<div class="row"><span>Card</span><strong>{card}</strong></div>
<div class="row"><span>Amount</span><strong>${payment.amount}</strong></div>
<div class="row"><span>Tax portion</span><strong>${payment.tax}</strong></div>
<div class="row"><span>Date</span><strong>{paid}</strong></div>
<div class="row total"><span>Total charged</span><span>${payment.amount}</span></div>
</div>
<div class="ft">Simulated payment — no real funds transferred. HotelOS Assignment Demo.</div>
</div></body></html>"""


def build_invoice_html(invoice, booking) -> str:
    guest = invoice.guest
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice {invoice.invoice_number}</title>
<style>
body{{font-family:Segoe UI,Arial,sans-serif;margin:0;background:#f1f5f9}}
.wrap{{max-width:640px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08)}}
.hdr{{background:linear-gradient(135deg,#0f172a,#334155);color:#fff;padding:32px}}
table{{width:100%;border-collapse:collapse;margin:20px 0}}
td,th{{padding:12px;text-align:left;border-bottom:1px solid #e2e8f0;font-size:14px}}
th{{background:#f8fafc}}
.total{{font-size:22px;font-weight:700;color:#0f172a}}
</style></head><body>
<div class="wrap">
<div class="hdr"><h1>INVOICE</h1><p>{invoice.invoice_number}</p></div>
<div style="padding:28px">
<p><strong>Bill to:</strong> {guest.full_name}<br>{guest.email}</p>
<p><strong>Reservation:</strong> Room {booking.room.room_number} · {booking.check_in} to {booking.check_out}</p>
<table>
<tr><th>Description</th><th>Amount</th></tr>
<tr><td>Room &amp; services (subtotal)</td><td>${invoice.subtotal}</td></tr>
<tr><td>Taxes</td><td>${invoice.tax}</td></tr>
<tr><td class="total">Total</td><td class="total">${invoice.total}</td></tr>
</table>
<p>Status: <strong>{invoice.status}</strong> · Issued: {invoice.issued_at}</p>
</div>
</div></body></html>"""
