const {
  connectRabbitMQ,
  createChannel,
  assertQueueWithBinding,
  ROUTING_KEYS,
} = require('@hotelos/shared');
const { translateEvent } = require('./eventTranslator');

async function startRealtimeConsumer(io, url, logger) {
  const connection = await connectRabbitMQ(url, logger);
  const channel = await createChannel(connection, logger);
  const queueName = 'gateway.realtime';

  await assertQueueWithBinding(channel, queueName, [
    ROUTING_KEYS.ROOM_ASSIGNED,
    ROUTING_KEYS.ROOM_STATUS_UPDATED,
    ROUTING_KEYS.ROOM_CLEANED,
    ROUTING_KEYS.MAINTENANCE_TICKET_CREATED,
    ROUTING_KEYS.SERVICE_ORDER_CREATED,
  ]);

  await channel.consume(
    queueName,
    (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        const routingKey = msg.fields.routingKey;
        const translated = translateEvent(routingKey, payload);
        if (translated) {
          io.to('property-default').emit(translated.socketEvent, translated.data);
          logger.info('Socket emit', translated.socketEvent, payload.roomNumber || payload.orderId);
        } else {
          logger.warn('Skipping unmapped event', routingKey);
        }
        channel.ack(msg);
      } catch (err) {
        logger.error('Realtime consumer error', err.message);
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );

  logger.info('Realtime consumer started on queue', queueName);
  return { connection, channel };
}

module.exports = { startRealtimeConsumer };
