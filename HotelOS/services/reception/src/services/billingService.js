const { getPool } = require('../config/database');

async function initializeBilling(client, booking) {
  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(booking.check_out_date) - new Date(booking.check_in_date)) / (1000 * 60 * 60 * 24)
    )
  );
  const subtotal = nights * parseFloat(booking.rate_per_night);
  const taxRate = parseFloat(process.env.TAX_RATE || '0.12');
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;
  const lineItems = [
    { type: 'room', description: `${nights} night(s)`, amount: subtotal },
  ];
  const { rows } = await client.query(
    `INSERT INTO invoices (booking_id, line_items, subtotal, tax_rate, tax_amount, total, payment_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id, total`,
    [booking.id, JSON.stringify(lineItems), subtotal, taxRate, taxAmount, total]
  );
  return rows[0];
}

async function finalizeCheckout(client, bookingId) {
  const { rows: bookings } = await client.query(
    `SELECT b.*, g.first_name, g.last_name FROM bookings b
     JOIN guests g ON g.id = b.guest_id WHERE b.id = $1`,
    [bookingId]
  );
  if (bookings.length === 0) throw Object.assign(new Error('Booking not found'), { status: 404 });
  const booking = bookings[0];

  const { rows: invoices } = await client.query(
    'SELECT * FROM invoices WHERE booking_id = $1 ORDER BY id DESC LIMIT 1',
    [bookingId]
  );
  let invoice = invoices[0];
  if (!invoice) {
    invoice = await initializeBilling(client, booking);
  }

  await client.query(
    `UPDATE bookings SET status = 'checked_out' WHERE id = $1`,
    [bookingId]
  );
  await client.query(
    `UPDATE rooms SET status = 'dirty', updated_at = NOW() WHERE room_number = $1`,
    [booking.room_number]
  );
  await client.query(
    `UPDATE invoices SET payment_status = 'paid' WHERE id = $1`,
    [invoice.id]
  );

  return { booking, invoice };
}

module.exports = { initializeBilling, finalizeCheckout };
