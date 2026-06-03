CREATE DATABASE hotelos_gateway;
CREATE DATABASE hotelos_reception;
CREATE DATABASE hotelos_housekeeping;
CREATE DATABASE hotelos_maintenance;
CREATE DATABASE hotelos_roomservice;

\connect hotelos_gateway
CREATE TABLE IF NOT EXISTS staff_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

\connect hotelos_reception
CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  accessibility_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  room_number VARCHAR(10) PRIMARY KEY,
  room_type VARCHAR(50) NOT NULL,
  floor INTEGER NOT NULL,
  near_elevator BOOLEAN DEFAULT FALSE,
  status VARCHAR(30) NOT NULL DEFAULT 'available',
  last_cleaned_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_reference VARCHAR(50) UNIQUE NOT NULL,
  guest_id INTEGER REFERENCES guests(id),
  room_type VARCHAR(50) NOT NULL,
  rate_per_night DECIMAL(10,2) NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'confirmed',
  room_number VARCHAR(10) REFERENCES rooms(room_number),
  floor_preference VARCHAR(20),
  proximity_preference VARCHAR(20),
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.12,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_type ON rooms(room_type);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);

INSERT INTO rooms (room_number, room_type, floor, near_elevator, status, last_cleaned_at) VALUES
  ('101', 'standard_double', 1, TRUE, 'available', NOW() - INTERVAL '5 days'),
  ('102', 'standard_double', 1, FALSE, 'available', NOW() - INTERVAL '3 days'),
  ('201', 'deluxe_king', 2, TRUE, 'available', NOW() - INTERVAL '7 days'),
  ('202', 'deluxe_king', 2, FALSE, 'available', NOW() - INTERVAL '2 days'),
  ('301', 'accessible_suite', 3, TRUE, 'available', NOW() - INTERVAL '4 days'),
  ('302', 'standard_double', 3, FALSE, 'dirty', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

INSERT INTO guests (first_name, last_name, email, accessibility_required) VALUES
  ('John', 'Smith', 'john@example.com', FALSE),
  ('Sarah', 'Lee', 'sarah@example.com', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO bookings (booking_reference, guest_id, room_type, rate_per_night, check_in_date, check_out_date, status, floor_preference) VALUES
  ('BK-2026-001', 1, 'standard_double', 120.00, CURRENT_DATE, CURRENT_DATE + 3, 'confirmed', 'high'),
  ('BK-2026-002', 2, 'accessible_suite', 180.00, CURRENT_DATE, CURRENT_DATE + 2, 'confirmed', 'low')
ON CONFLICT DO NOTHING;

\connect hotelos_housekeeping
CREATE TABLE IF NOT EXISTS rooms (
  room_number VARCHAR(10) PRIMARY KEY,
  status VARCHAR(30) NOT NULL DEFAULT 'available',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cleaning_tasks (
  id SERIAL PRIMARY KEY,
  room_number VARCHAR(10) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  assigned_staff VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cleaning_tasks_pending_room ON cleaning_tasks(room_number) WHERE status = 'pending';

INSERT INTO rooms (room_number, status) VALUES
  ('101', 'available'), ('102', 'available'), ('201', 'available'),
  ('202', 'available'), ('301', 'available'), ('302', 'dirty')
ON CONFLICT DO NOTHING;

\connect hotelos_maintenance
CREATE TABLE IF NOT EXISTS rooms (
  room_number VARCHAR(10) PRIMARY KEY,
  status VARCHAR(30) NOT NULL DEFAULT 'available',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id SERIAL PRIMARY KEY,
  room_number VARCHAR(10) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  severity INTEGER NOT NULL DEFAULT 3,
  guest_impact BOOLEAN DEFAULT FALSE,
  sla_deadline TIMESTAMPTZ,
  technician VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO rooms (room_number, status) VALUES
  ('101', 'available'), ('102', 'available'), ('201', 'available'),
  ('202', 'available'), ('301', 'available'), ('302', 'dirty')
ON CONFLICT DO NOTHING;

\connect hotelos_roomservice
CREATE TABLE IF NOT EXISTS rooms (
  room_number VARCHAR(10) PRIMARY KEY,
  status VARCHAR(30) NOT NULL DEFAULT 'available',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_orders (
  id SERIAL PRIMARY KEY,
  room_number VARCHAR(10) NOT NULL,
  guest_reference VARCHAR(50),
  booking_id INTEGER,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES service_orders(id) ON DELETE CASCADE,
  item_name VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO rooms (room_number, status) VALUES
  ('101', 'available'), ('102', 'available'), ('201', 'available'),
  ('202', 'available'), ('301', 'available'), ('302', 'dirty')
ON CONFLICT DO NOTHING;
