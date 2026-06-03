const {
  connectRabbitMQ,
  createChannel,
  publishEvent,
  ROUTING_KEYS,
} = require('@hotelos/shared');

let channel;

async function initPublisher(url, logger) {
  const connection = await connectRabbitMQ(url, logger);
  channel = await createChannel(connection, logger);
  return { connection, channel };
}

function getChannel() {
  if (!channel) throw new Error('RabbitMQ channel not initialized');
  return channel;
}

async function publishRoomAssigned(payload, correlationId) {
  await publishEvent(getChannel(), ROUTING_KEYS.ROOM_ASSIGNED, payload, { correlationId });
}

async function publishRoomStatusUpdated(payload, correlationId) {
  await publishEvent(getChannel(), ROUTING_KEYS.ROOM_STATUS_UPDATED, payload, { correlationId });
}

async function publishCheckoutCompleted(payload, correlationId) {
  await publishEvent(getChannel(), ROUTING_KEYS.CHECKOUT_COMPLETED, payload, { correlationId });
}

module.exports = {
  initPublisher,
  getChannel,
  publishRoomAssigned,
  publishRoomStatusUpdated,
  publishCheckoutCompleted,
};
