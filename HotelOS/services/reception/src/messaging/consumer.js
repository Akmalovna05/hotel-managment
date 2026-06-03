const {
  assertQueueWithBinding,
  ROUTING_KEYS,
  ROOM_STATUS,
} = require('@hotelos/shared');
const { getPool } = require('../config/database');
const { getChannel } = require('./publisher');

async function startConsumer(logger) {
  const channel = getChannel();
  const queueName = 'reception.events';

  await assertQueueWithBinding(channel, queueName, [
    ROUTING_KEYS.ROOM_CLEANED,
    ROUTING_KEYS.ROOM_STATUS_UPDATED,
  ]);

  await channel.consume(
    queueName,
    async (msg) => {
      if (!msg) return;
      const routingKey = msg.fields.routingKey;
      try {
        const payload = JSON.parse(msg.content.toString());
        const pool = getPool();
        const client = await pool.connect();
        try {
          if (routingKey === ROUTING_KEYS.ROOM_CLEANED) {
            const eventTime = new Date(payload.timestamp || Date.now());
            await client.query(
              `UPDATE rooms SET status = $1, last_cleaned_at = $2, updated_at = $2
               WHERE room_number = $3`,
              [ROOM_STATUS.AVAILABLE, eventTime, payload.roomNumber]
            );
            logger.info('Room cleaned synced', payload.roomNumber);
          } else if (
            routingKey === ROUTING_KEYS.ROOM_STATUS_UPDATED &&
            payload.source !== 'ReceptionService'
          ) {
            await client.query(
              `UPDATE rooms SET status = $1, updated_at = $2
               WHERE room_number = $3`,
              [payload.status, new Date(payload.timestamp || Date.now()), payload.roomNumber]
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
    },
    { noAck: false }
  );

  logger.info('Reception consumer started');
}

module.exports = { startConsumer };
