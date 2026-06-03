const { getPool } = require('../config/database');
const { publishOrderCreated } = require('../messaging/messaging');

async function createOrder(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || 'unknown';
  const { roomNumber, guestReference, bookingId, items } = req.body;
  if (!roomNumber || !items?.length) {
    return res.status(422).json({ error: 'roomNumber and items required' });
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: orders } = await client.query(
      `INSERT INTO service_orders (room_number, guest_reference, booking_id, status, delivery_status)
       VALUES ($1, $2, $3, 'pending', 'queued') RETURNING *`,
      [roomNumber, guestReference || null, bookingId || null]
    );
    const order = orders[0];
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, item_name, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
        [order.id, item.name, item.quantity || 1, item.unitPrice]
      );
    }
    await client.query('COMMIT');

    await publishOrderCreated({
      orderId: order.id,
      roomNumber,
      status: order.status,
      timestamp: new Date().toISOString(),
    }, correlationId);

    res.status(201).json({ order });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function updateOrderStatus(req, res, next) {
  const { id } = req.params;
  const { status, deliveryStatus } = req.body;
  const { rows } = await getPool().query(
    `UPDATE service_orders SET status = COALESCE($1, status), delivery_status = COALESCE($2, delivery_status), updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [status, deliveryStatus, id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
  res.json({ order: rows[0] });
}

async function getCharges(req, res, next) {
  const { bookingId } = req.params;
  try {
    const { rows } = await getPool().query(
      `SELECT o.id, oi.item_name, oi.quantity, oi.unit_price,
              (oi.quantity * oi.unit_price) AS line_total
       FROM service_orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.booking_id = $1`,
      [bookingId]
    );
    const total = rows.reduce((sum, r) => sum + parseFloat(r.line_total), 0);
    res.json({ bookingId, items: rows, total });
  } catch (err) { next(err); }
}

module.exports = { createOrder, updateOrderStatus, getCharges };
