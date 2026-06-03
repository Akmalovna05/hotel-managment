const { connectRabbitMQ, createChannel, publishEvent, ROUTING_KEYS } = require('@hotelos/shared');
let channel;
async function initPublisher(url, logger) {
  const connection = await connectRabbitMQ(url, logger);
  channel = await createChannel(connection, logger);
  return { connection, channel };
}
function getChannel() { return channel; }
async function publishTicketCreated(payload, correlationId) {
  await publishEvent(getChannel(), ROUTING_KEYS.MAINTENANCE_TICKET_CREATED, payload, { correlationId });
}
async function publishRoomStatusUpdated(payload, correlationId) {
  await publishEvent(getChannel(), ROUTING_KEYS.ROOM_STATUS_UPDATED, payload, { correlationId });
}
module.exports = { initPublisher, getChannel, publishTicketCreated, publishRoomStatusUpdated };
