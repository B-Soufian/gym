// ============================================
// Lakhlifi Gym v9.0 — Database Configuration
// PostgreSQL connection pool with RLS support
// ============================================

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'gymvision',
  user: process.env.DB_USER || 'gymvision_app',
  password: process.env.DB_PASSWORD || 'gymvision_secret_2025',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Execute a query with RLS context injection.
 * This ensures every query runs within the correct tenant context.
 *
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @param {Object} rlsContext - { userId, username, gymId, role }
 * @returns {Promise<pg.QueryResult>}
 */
export async function queryWithRLS(text, params = [], rlsContext = null) {
  const client = await pool.connect();
  try {
    if (rlsContext) {
      // When no gym is selected (global view), use SUPER_ADMIN bypass in RLS
      const effectiveRole = !rlsContext.gymId ? 'SUPER_ADMIN' : rlsContext.role;
      await client.query('BEGIN');
      
      // Use set_config via SELECT for maximum compatibility
      await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [rlsContext.userId.toString()]);
      await client.query(`SELECT set_config('app.current_username', $1, true)`, [rlsContext.username]);
      await client.query(`SELECT set_config('app.current_gym_id', $1, true)`, [(rlsContext.gymId || 0).toString()]);
      await client.query(`SELECT set_config('app.current_role', $1, true)`, [effectiveRole]);
      
      const result = await client.query(text, params);
      await client.query('COMMIT');
      return result;
    }
    return await client.query(text, params);
  } catch (err) {
    if (rlsContext) {
      await client.query('ROLLBACK');
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction with RLS context.
 * Passes a client to the callback for multiple queries in one transaction.
 *
 * @param {Object} rlsContext - { userId, username, gymId, role }
 * @param {Function} callback - async (client) => { ... }
 * @returns {Promise<any>}
 */
export async function transactionWithRLS(rlsContext, callback) {
  const client = await pool.connect();
  try {
    const effectiveRole = !rlsContext.gymId ? 'SUPER_ADMIN' : rlsContext.role;
    await client.query('BEGIN');
    
    await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [rlsContext.userId.toString()]);
    await client.query(`SELECT set_config('app.current_username', $1, true)`, [rlsContext.username]);
    await client.query(`SELECT set_config('app.current_gym_id', $1, true)`, [(rlsContext.gymId || 0).toString()]);
    await client.query(`SELECT set_config('app.current_role', $1, true)`, [effectiveRole]);

    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Simple query (for workers/auth) — sets a default SUPER_ADMIN context 
 * to satisfy RLS policies without crashing.
 */
export async function query(text, params = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      SELECT 
        set_config('app.current_user_id', '0', true),
        set_config('app.current_username', 'system_worker', true),
        set_config('app.current_gym_id', '0', true),
        set_config('app.current_role', 'SUPER_ADMIN', true)
    `);
    
    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Health check — test database connectivity
 */
export async function healthCheck() {
  const result = await pool.query('SELECT NOW() AS now');
  return result.rows[0].now;
}

export default pool;
