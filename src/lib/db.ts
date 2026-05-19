import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
});

export const db = {
    query: (text: string, params?: any[]) => pool.query(text, params),
};
