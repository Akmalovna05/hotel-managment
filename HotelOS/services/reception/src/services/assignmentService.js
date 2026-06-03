const { getPool } = require('../config/database');
const { ROOM_STATUS, INELIGIBLE_FOR_ASSIGNMENT } = require('@hotelos/shared');

function rankByLongestClean(rooms) {
  return [...rooms].sort((a, b) => {
    const aTime = a.last_cleaned_at ? new Date(a.last_cleaned_at).getTime() : 0;
    const bTime = b.last_cleaned_at ? new Date(b.last_cleaned_at).getTime() : 0;
    return aTime - bTime;
  });
}

function applyFloorPreference(rooms, preference) {
  if (!preference || rooms.length === 0) return { rooms, deviation: false };
  const pref = preference.toLowerCase();
  let filtered = rooms;
  if (pref === 'high') filtered = rooms.filter((r) => r.floor >= 2);
  else if (pref === 'low') filtered = rooms.filter((r) => r.floor <= 1);
  if (filtered.length > 0) return { rooms: filtered, deviation: false };
  return { rooms, deviation: true };
}

function applyProximityPreference(rooms, preference, accessibilityRequired) {
  if (accessibilityRequired) {
    const accessible = rooms.filter((r) => r.near_elevator && r.floor <= 1);
    if (accessible.length > 0) return accessible;
  }
  if (preference === 'elevator') {
    const near = rooms.filter((r) => r.near_elevator);
    if (near.length > 0) return near;
  }
  return rooms;
}

async function loadEligibleRooms(client, roomType) {
  const { rows } = await client.query(
    `SELECT room_number, room_type, floor, near_elevator, status, last_cleaned_at, updated_at
     FROM rooms WHERE room_type = $1`,
    [roomType]
  );
  return rows.filter((r) => !INELIGIBLE_FOR_ASSIGNMENT.has(r.status));
}

async function tryLockRoom(client, roomNumber) {
  const { rows } = await client.query(
    `UPDATE rooms SET status = $1, updated_at = NOW()
     WHERE room_number = $2 AND status = $3
     RETURNING room_number, room_type, floor, status`,
    [ROOM_STATUS.ASSIGNING, roomNumber, ROOM_STATUS.AVAILABLE]
  );
  return rows[0] || null;
}

async function assignRoom(client, booking, correlationId) {
  let eligible = await loadEligibleRooms(client, booking.room_type);
  if (eligible.length === 0) {
    return { success: false, reason: 'NO_ROOMS_AVAILABLE', code: 'TYPE_MISMATCH_OR_OCCUPIED' };
  }

  const floorResult = applyFloorPreference(eligible, booking.floor_preference);
  eligible = floorResult.rooms;

  eligible = applyProximityPreference(
    eligible,
    booking.proximity_preference,
    booking.accessibility_required
  );
  if (eligible.length === 0) {
    return { success: false, reason: 'NO_ROOMS_AVAILABLE', code: 'PREFERENCE_EXHAUSTED' };
  }

  const ranked = rankByLongestClean(eligible);
  const fallback = [...ranked];

  while (fallback.length > 0) {
    const candidate = fallback.shift();
    const locked = await tryLockRoom(client, candidate.room_number);
    if (locked) {
      await client.query(
        `UPDATE bookings SET room_number = $1, status = 'checked_in', assigned_at = NOW()
         WHERE id = $2`,
        [locked.room_number, booking.id]
      );
      await client.query(
        `UPDATE rooms SET status = $1, updated_at = NOW() WHERE room_number = $2`,
        [ROOM_STATUS.OCCUPIED, locked.room_number]
      );
      return {
        success: true,
        roomNumber: locked.room_number,
        floor: candidate.floor,
        preferenceDeviation: floorResult.deviation,
        correlationId,
      };
    }
  }

  return { success: false, reason: 'NO_ROOMS_AVAILABLE', code: 'ALL_LOCKED' };
}

module.exports = {
  assignRoom,
  loadEligibleRooms,
  rankByLongestClean,
  applyFloorPreference,
};
