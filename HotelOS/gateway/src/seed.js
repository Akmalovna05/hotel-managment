const bcrypt = require('bcryptjs');
const { getPool, testConnection, closePool } = require('./config/database');

const DEMO_USERS = [
  { username: 'reception', password: 'reception123', role: 'reception' },
  { username: 'housekeeping', password: 'housekeeping123', role: 'housekeeping' },
  { username: 'maintenance', password: 'maintenance123', role: 'maintenance' },
  { username: 'roomservice', password: 'roomservice123', role: 'roomservice' },
];

async function seedStaffUsers() {
  for (const user of DEMO_USERS) {
    const hash = await bcrypt.hash(user.password, 10);
    await getPool().query(
      `INSERT INTO staff_users (username, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
      [user.username, hash, user.role]
    );
  }
  console.log('[gateway] Staff users seeded');
}

module.exports = { seedStaffUsers, DEMO_USERS };
