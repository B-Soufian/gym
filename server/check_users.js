import pg from 'pg';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const { Client } = pg;

async function checkUsers() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'gymvision',
    user: process.env.DB_USER || 'gymvision_app',
    password: process.env.DB_PASSWORD || 'gymvision_secret_2025',
  });

  try {
    await client.connect();
    const res = await client.query('SELECT id, username, role FROM users');
    console.log('Users in DB:', res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkUsers();
