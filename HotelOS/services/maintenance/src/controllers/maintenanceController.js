const { getPool } = require('../config/database');
const { publishTicketCreated, publishRoomStatusUpdated } = require('../messaging/publisher');
const { getOrderedTickets } = require('../services/priorityQueueService');
const { ROOM_STATUS } = require('@hotelos/shared');

async function createTicket(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || 'unknown';
  const { roomNumber, category, description, severity, guestImpact } = req.body;
  if (!roomNumber || !category) return res.status(422).json({ error: 'roomNumber and category required' });

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const sla = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const { rows } = await client.query(
      `INSERT INTO maintenance_tickets (room_number, category, description, severity, guest_impact, sla_deadline, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open') RETURNING *`,
      [roomNumber, category, description || '', severity || 3, guestImpact || false, sla]
    );
    await client.query(
      `INSERT INTO rooms (room_number, status, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (room_number) DO UPDATE SET status = $2, updated_at = NOW()`,
      [roomNumber, ROOM_STATUS.MAINTENANCE_PENDING]
    );
    await client.query('COMMIT');

    const ticket = rows[0];
    const timestamp = new Date().toISOString();
    await publishTicketCreated({
      ticketId: ticket.id,
      roomNumber,
      category,
      severity: ticket.severity,
      timestamp,
    }, correlationId);
    await publishRoomStatusUpdated({
      roomNumber,
      status: ROOM_STATUS.MAINTENANCE_PENDING,
      timestamp,
      source: 'MaintenanceService',
    }, correlationId);

    const pool = getPool();
    const queueClient = await pool.connect();
    let queuePosition = 1;
    try {
      const queue = await getOrderedTickets(queueClient);
      queuePosition = queue.findIndex((t) => t.id === ticket.id) + 1;
    } finally {
      queueClient.release();
    }
    res.status(201).json({ ticket, queuePosition });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      /* transaction may already be committed */
    }
    next(err);
  } finally {
    client.release();
  }
}

async function assignTicket(req, res, next) {
  const { ticketId, technician } = req.body;
  if (!ticketId || !technician) return res.status(422).json({ error: 'ticketId and technician required' });

  const { rows } = await getPool().query(
    `UPDATE maintenance_tickets SET technician = $1, status = 'assigned', updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [technician, ticketId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ ticket: rows[0] });
}

async function listTickets(_req, res, next) {
  try {
    const client = await getPool().connect();
    try {
      const tickets = await getOrderedTickets(client);
      res.json({ tickets });
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
}

module.exports = { createTicket, assignTicket, listTickets };
