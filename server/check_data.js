import pg from 'pg';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const { Client } = pg;

async function checkData() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'gymvision',
    user: process.env.DB_USER || 'gymvision_app',
    password: process.env.DB_PASSWORD || 'gymvision_secret_2025',
  });

  try {
    await client.connect();
    const members = await client.query('SELECT COUNT(*) FROM members');
    const payments = await client.query('SELECT COUNT(*) FROM payments');
    console.log('Members count:', members.rows[0].count);
    console.log('Payments count:', payments.rows[0].count);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkData();
