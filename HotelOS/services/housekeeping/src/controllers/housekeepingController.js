const { getPool } = require('../config/database');
const { publishRoomCleaned, publishRoomStatusUpdated } = require('../messaging/publisher');
const { ROOM_STATUS } = require('@hotelos/shared');

async function getTasks(_req, res, next) {
  try {
    const { rows } = await getPool().query(
      `SELECT * FROM cleaning_tasks WHERE status != 'completed' ORDER BY created_at ASC`
    );
    res.json({ tasks: rows });
  } catch (err) { next(err); }
}

async function completeTask(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || 'unknown';
  const { roomNumber, staffName } = req.body;
  if (!roomNumber) return res.status(422).json({ error: 'roomNumber required' });

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `UPDATE cleaning_tasks SET status = 'completed', assigned_staff = $1, completed_at = NOW()
       WHERE room_number = $2 AND status != 'completed'`,
      [staffName || 'staff', roomNumber]
    );
    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No active task for room' });
    }
    await client.query(
      `UPDATE rooms SET status = $1, updated_at = NOW() WHERE room_number = $2`,
      [ROOM_STATUS.AVAILABLE, roomNumber]
    );
    await client.query('COMMIT');

    const timestamp = new Date().toISOString();
    await publishRoomCleaned({ roomNumber, timestamp, source: 'HousekeepingService' }, correlationId);
    await publishRoomStatusUpdated(
      { roomNumber, status: ROOM_STATUS.AVAILABLE, timestamp, source: 'HousekeepingService' },
      correlationId
    );
    res.json({ message: 'Task completed', roomNumber });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { getTasks, completeTask };
