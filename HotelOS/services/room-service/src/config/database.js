const { Pool } = require('pg');
let pool;
function getPool() { if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL }); return pool; }
async function testConnection() { const c = await getPool().connect(); try { await c.query('SELECT 1'); } finally { c.release(); } }
module.exports = { getPool, testConnection };
