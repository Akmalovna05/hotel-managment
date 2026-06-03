const { ROUTING_KEYS, SOCKET_EVENTS } = require('@hotelos/shared');

/**
 * Maps RabbitMQ routing keys to Socket.IO events for the realtime consumer.
 * Returns null for unknown or invalid events (consumer acks without emitting).
 */
function translateEvent(routingKey, payload) {
  if (!routingKey || typeof routingKey !== 'string') {
    return null;
  }
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  switch (routingKey) {
    case ROUTING_KEYS.ROOM_ASSIGNED:
    case ROUTING_KEYS.ROOM_STATUS_UPDATED:
    case ROUTING_KEYS.ROOM_CLEANED:
      return {
        socketEvent: SOCKET_EVENTS.ROOM_STATUS_CHANGED,
        data: {
          roomNumber: payload.roomNumber,
          status: payload.status,
          timestamp: payload.timestamp || new Date().toISOString(),
          source: payload.source,
          preferenceDeviation: payload.preferenceDeviation || false,
        },
      };
    case ROUTING_KEYS.MAINTENANCE_TICKET_CREATED:
      return {
        socketEvent: SOCKET_EVENTS.MAINTENANCE_ALERT,
        data: {
          ticketId: payload.ticketId,
          roomNumber: payload.roomNumber,
          severity: payload.severity,
          category: payload.category,
          timestamp: payload.timestamp || new Date().toISOString(),
        },
      };
    case ROUTING_KEYS.SERVICE_ORDER_CREATED:
      return {
        socketEvent: SOCKET_EVENTS.ORDER_STATUS_CHANGED,
        data: {
          orderId: payload.orderId,
          roomNumber: payload.roomNumber,
          status: payload.status,
          timestamp: payload.timestamp || new Date().toISOString(),
        },
      };
    default:
      return null;
  }
}

module.exports = { translateEvent };
