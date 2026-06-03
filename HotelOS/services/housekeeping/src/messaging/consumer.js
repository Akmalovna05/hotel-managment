const { assertQueueWithBinding, ROUTING_KEYS, ROOM_STATUS } = require('@hotelos/shared');
const { getPool } = require('../config/database');
const { getChannel } = require('./publisher');

async function startConsumer(logger) {
  const channel = getChannel();
  const queueName = 'housekeeping.events';
  await assertQueueWithBinding(channel, queueName, [
    ROUTING_KEYS.ROOM_ASSIGNED,
    ROUTING_KEYS.ROOM_STATUS_UPDATED,
    ROUTING_KEYS.CHECKOUT_COMPLETED,
  ]);

  await channel.consume(queueName, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      const key = msg.fields.routingKey;
      const client = await getPool().connect();
      try {
        if (key === ROUTING_KEYS.ROOM_ASSIGNED) {
          await client.query(
            `INSERT INTO rooms (room_number, status, updated_at) VALUES ($1, $2, NOW())
             ON CONFLICT (room_number) DO UPDATE SET status = $2, updated_at = NOW()`,
            [payload.roomNumber, ROOM_STATUS.OCCUPIED]
          );
        } else if (key === ROUTING_KEYS.CHECKOUT_COMPLETED || (key === ROUTING_KEYS.ROOM_STATUS_UPDATED && payload.status === ROOM_STATUS.DIRTY)) {
          await client.query(
            `INSERT INTO rooms (room_number, status, updated_at) VALUES ($1, $2, NOW())
             ON CONFLICT (room_number) DO UPDATE SET status = $2, updated_at = NOW()`,
            [payload.roomNumber, ROOM_STATUS.DIRTY]
          );
          await client.query(
            `INSERT INTO cleaning_tasks (room_number, status) VALUES ($1, 'pending')
             ON CONFLICT (room_number) WHERE status = 'pending' DO NOTHING`,
            [payload.roomNumber]
          );
        }
        channel.ack(msg);
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error('Consumer error', err.message);
      channel.nack(msg, false, false);
    }
  }, { noAck: false });
  logger.info('Housekeeping consumer started');
}

module.exports = { startConsumer };
