export default function RoomGrid({ rooms }) {
  if (!rooms?.length) {
    return <p className="empty">No rooms loaded.</p>;
  }

  return (
    <div className="room-grid">
      {rooms.map((room) => (
        <div
          key={room.room_number}
          className="room-tile"
          data-status={room.status}
        >
          <strong>Room {room.room_number}</strong>
          <span className="room-type">{room.room_type.replace('_', ' ')}</span>
          <span>Floor {room.floor} {room.near_elevator ? '• Near Lift' : ''}</span>
          <span className="status-badge">{room.status.replace(/_/g, ' ')}</span>
        </div>
      ))}
    </div>
  );
}
