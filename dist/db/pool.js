import { Pool } from 'pg';
import { config } from '../config/env.js';
const pool = new Pool({
    connectionString: config.db.url,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
});
export async function query(text, params) {
    const client = await pool.connect();
    try {
        const res = await client.query(text, params);
        return { rows: res.rows };
    }
    finally {
        client.release();
    }
}
export default pool;
//# sourceMappingURL=pool.js.map