const EXCHANGE = 'hotelos.events';
const DEAD_LETTER_EXCHANGE = 'hotelos.deadletter';

const ROUTING_KEYS = {
  ROOM_ASSIGNED: 'room.assigned',
  ROOM_STATUS_UPDATED: 'room.status.updated',
  ROOM_CLEANED: 'room.cleaned',
  MAINTENANCE_TICKET_CREATED: 'maintenance.ticket.created',
  SERVICE_ORDER_CREATED: 'service.order.created',
  CHECKOUT_COMPLETED: 'checkout.completed',
};

const SOCKET_EVENTS = {
  ROOM_STATUS_CHANGED: 'roomStatusChanged',
  MAINTENANCE_ALERT: 'maintenanceAlert',
  ORDER_STATUS_CHANGED: 'orderStatusChanged',
};

module.exports = { EXCHANGE, DEAD_LETTER_EXCHANGE, ROUTING_KEYS, SOCKET_EVENTS };
