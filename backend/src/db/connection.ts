import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://tram:tram@localhost:5432/tram_db'
});

export async function ensureSchema(): Promise<void> {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  await pool.query(schema);
}
