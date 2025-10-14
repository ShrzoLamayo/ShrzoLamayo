import { Pool } from 'pg';
import { config } from '../config/env.js';

const pool = new Pool({
  connectionString: config.db.url,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[] }>{
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return { rows: res.rows as T[] };
  } finally {
    client.release();
  }
}

export default pool;
