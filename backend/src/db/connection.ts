import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// DATABASE_URL이 있으면 그대로 쓰고(로컬 개발용 .env의 기존 방식과 하위호환),
// 없으면 DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME 개별 값을 조합한다
// (k8s에서는 비밀번호를 통짜 URL에 평문으로 커밋하지 않기 위해 이 방식을 쓴다).
function resolveConnectionString(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_USER = 'tram',
    DB_PASSWORD = 'tram',
    DB_NAME = 'tram_db'
  } = process.env;
  return `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

export const pool = new Pool({
  connectionString: resolveConnectionString()
});

export async function ensureSchema(): Promise<void> {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  await pool.query(schema);
}
