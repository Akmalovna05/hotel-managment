const ROOM_STATUS = {
  AVAILABLE: 'available',
  ASSIGNING: 'assigning',
  OCCUPIED: 'occupied',
  DIRTY: 'dirty',
  CLEANING_IN_PROGRESS: 'cleaning_in_progress',
  MAINTENANCE_PENDING: 'maintenance_pending',
  OUT_OF_ORDER: 'out_of_order',
};

const INELIGIBLE_FOR_ASSIGNMENT = new Set([
  ROOM_STATUS.DIRTY,
  ROOM_STATUS.CLEANING_IN_PROGRESS,
  ROOM_STATUS.MAINTENANCE_PENDING,
  ROOM_STATUS.OUT_OF_ORDER,
  ROOM_STATUS.OCCUPIED,
  ROOM_STATUS.ASSIGNING,
]);

module.exports = { ROOM_STATUS, INELIGIBLE_FOR_ASSIGNMENT };
