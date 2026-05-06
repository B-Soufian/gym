import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const { Client } = pg;

async function resetPassword() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'gymvision',
    user: process.env.DB_USER || 'gymvision_app',
    password: process.env.DB_PASSWORD || 'gymvision_secret_2025',
  });

  try {
    await client.connect();
    const newHash = await bcrypt.hash('zahra123', 12);
    await client.query('UPDATE users SET password_hash = $1 WHERE username = $2', [newHash, 'zahra']);
    console.log('✅ Password for "zahra" reset to "zahra123"');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

resetPassword();
