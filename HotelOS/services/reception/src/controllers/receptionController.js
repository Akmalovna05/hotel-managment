const { getPool } = require('../config/database');
const { assignRoom } = require('../services/assignmentService');
const { initializeBilling, finalizeCheckout } = require('../services/billingService');
const {
  publishRoomAssigned,
  publishRoomStatusUpdated,
  publishCheckoutCompleted,
} = require('../messaging/publisher');
const { ROOM_STATUS, createLogger } = require('@hotelos/shared');

const logger = createLogger('reception-controller');

/**
 * NASA Standard: Input Validation & Pre-condition check
 */
function validateBookingRef(ref) {
  if (!ref || typeof ref !== 'string' || ref.length < 5) {
    throw new Error('INVALID_BOOKING_REFERENCE');
  }
}

async function checkIn(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || `req-${Date.now()}`;
  const { bookingReference } = req.body;

  try {
    validateBookingRef(bookingReference);
    logger.info('Check-in initiated', { bookingReference, correlationId });
  } catch (err) {
    logger.warn('Check-in validation failed', { bookingReference, error: err.message });
    return res.status(422).json({ error: 'bookingReference is required and must be valid' });
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    // NASA Standard: Atomic Transaction - No partial failures
    await client.query('BEGIN');

    const { rows: bookingRows } = await client.query(
      `SELECT b.*, g.accessibility_required FROM bookings b
       JOIN guests g ON g.id = b.guest_id
       WHERE b.booking_reference = $1 FOR UPDATE`,
      [bookingReference]
    );

    if (bookingRows.length === 0) {
      await client.query('ROLLBACK');
      logger.audit('CHECKIN_FAILED', 'system', { reason: 'Booking not found', bookingReference });
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingRows[0];
    if (booking.status !== 'confirmed') {
      await client.query('ROLLBACK');
      logger.audit('CHECKIN_REJECTED', 'system', { reason: 'Invalid status', status: booking.status, bookingReference });
      return res.status(422).json({ error: `Booking is in ${booking.status} status, expected confirmed` });
    }

    // Room Assignment Logic
    const assignment = await assignRoom(client, booking, correlationId);
    if (!assignment.success) {
      await client.query('ROLLBACK');
      logger.error('Room assignment failed', { bookingReference, reason: assignment.reason });
      return res.status(409).json({
        error: 'No room available',
        reason: assignment.reason,
        code: assignment.code,
      });
    }

    const invoice = await initializeBilling(client, booking);
    
    // Finalize DB state
    await client.query('COMMIT');
    logger.audit('CHECKIN_SUCCESS', 'system', { roomNumber: assignment.roomNumber, bookingReference });

    const timestamp = new Date().toISOString();
    const eventPayload = {
      roomNumber: assignment.roomNumber,
      bookingReference,
      guestId: booking.guest_id,
      status: ROOM_STATUS.OCCUPIED,
      timestamp,
      source: 'ReceptionService',
      preferenceDeviation: assignment.preferenceDeviation,
    };

    // NASA Standard: Fire-and-forget messaging with logging
    Promise.all([
      publishRoomAssigned({
        roomNumber: assignment.roomNumber,
        bookingReference,
        guestId: booking.guest_id,
        assignmentTimestamp: timestamp,
        preferenceDeviation: assignment.preferenceDeviation,
      }, correlationId),
      publishRoomStatusUpdated(eventPayload, correlationId)
    ]).catch(e => logger.error('Messaging failure after commit', e));

    res.status(200).json({
      message: 'Check-in complete',
      roomNumber: assignment.roomNumber,
      floor: assignment.floor,
      preferenceDeviation: assignment.preferenceDeviation,
      invoiceId: invoice.id,
      invoiceTotal: invoice.total,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Critical failure during check-in', err);
    res.status(500).json({ error: 'Internal system error', traceId: correlationId });
  } finally {
    client.release();
  }
}

async function checkOut(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || `req-${Date.now()}`;
  const { bookingReference } = req.body;

  try {
    validateBookingRef(bookingReference);
    logger.info('Check-out initiated', { bookingReference, correlationId });
  } catch (err) {
    return res.status(422).json({ error: 'Valid bookingReference is required' });
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id FROM bookings WHERE booking_reference = $1 AND status = $2',
      [bookingReference, 'checked_in']
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn('Check-out failed: Active booking not found', { bookingReference });
      return res.status(404).json({ error: 'Active booking not found for this reference' });
    }

    const result = await finalizeCheckout(client, rows[0].id);
    await client.query('COMMIT');
    logger.audit('CHECKOUT_SUCCESS', 'system', { bookingReference, roomNumber: result.booking.room_number });

    const timestamp = new Date().toISOString();
    
    // Broadcast updates
    Promise.all([
      publishRoomStatusUpdated({
        roomNumber: result.booking.room_number,
        status: ROOM_STATUS.DIRTY,
        timestamp,
        source: 'ReceptionService',
      }, correlationId),
      publishCheckoutCompleted({
        roomNumber: result.booking.room_number,
        bookingReference,
        timestamp,
      }, correlationId)
    ]).catch(e => logger.error('Messaging failure after checkout commit', e));

    res.json({
      message: 'Checkout complete',
      roomNumber: result.booking.room_number,
      invoice: result.invoice,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Critical failure during check-out', err);
    res.status(500).json({ error: 'Internal system error', traceId: correlationId });
  } finally {
    client.release();
  }
}

async function getAvailability(_req, res, next) {
  try {
    const { rows } = await getPool().query(
      `SELECT room_number, room_type, floor, near_elevator, status, updated_at
       FROM rooms ORDER BY floor, room_number`
    );
    res.json({ rooms: rows });
  } catch (err) {
    logger.error('Failed to fetch room availability', err);
    res.status(500).json({ error: 'Could not fetch rooms' });
  }
}

module.exports = { checkIn, checkOut, getAvailability };
