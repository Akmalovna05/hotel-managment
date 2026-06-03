const { getPool } = require('../config/database');
const {
  connectRabbitMQ,
  createChannel,
  publishEvent,
  assertQueueWithBinding,
  ROUTING_KEYS,
} = require('@hotelos/shared');

let channel;
let connection;

async function initMessaging(url, logger) {
  connection = await connectRabbitMQ(url, logger);
  channel = await createChannel(connection, logger);
  await assertQueueWithBinding(channel, 'roomservice.events', [ROUTING_KEYS.ROOM_ASSIGNED]);
  await channel.consume(
    'roomservice.events',
    async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        await getPool().query(
          `INSERT INTO rooms (room_number, status, updated_at) VALUES ($1, 'occupied', NOW())
           ON CONFLICT (room_number) DO UPDATE SET status = 'occupied', updated_at = NOW()`,
          [payload.roomNumber]
        );
        channel.ack(msg);
      } catch (err) {
        logger.error(err.message);
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );
  return { connection, channel };
}

async function publishOrderCreated(payload, correlationId) {
  await publishEvent(channel, ROUTING_KEYS.SERVICE_ORDER_CREATED, payload, { correlationId });
}

module.exports = { initMessaging, publishOrderCreated };
