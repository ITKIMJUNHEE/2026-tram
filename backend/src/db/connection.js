const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://tram:tram@localhost:5432/tram_db'
});

async function ensureSchema() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  await pool.query(schema);
}

module.exports = { pool, ensureSchema };
