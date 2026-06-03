const { INELIGIBLE_FOR_ASSIGNMENT, ROOM_STATUS } = require('@hotelos/shared');
const { rankByLongestClean, applyFloorPreference } = require('./assignmentService');

describe('assignmentService', () => {
  test('rankByLongestClean sorts oldest clean first', () => {
    const rooms = [
      { room_number: '101', last_cleaned_at: new Date('2026-05-20') },
      { room_number: '102', last_cleaned_at: new Date('2026-05-10') },
    ];
    const ranked = rankByLongestClean(rooms);
    expect(ranked[0].room_number).toBe('102');
  });

  test('applyFloorPreference high floor filters correctly', () => {
    const rooms = [
      { room_number: '101', floor: 1 },
      { room_number: '201', floor: 2 },
    ];
    const result = applyFloorPreference(rooms, 'high');
    expect(result.rooms).toHaveLength(1);
    expect(result.rooms[0].floor).toBe(2);
  });

  test('INELIGIBLE_FOR_ASSIGNMENT excludes dirty rooms', () => {
    expect(INELIGIBLE_FOR_ASSIGNMENT.has(ROOM_STATUS.DIRTY)).toBe(true);
    expect(INELIGIBLE_FOR_ASSIGNMENT.has(ROOM_STATUS.AVAILABLE)).toBe(false);
  });
});
