import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const { Client } = pg;

async function createUser() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'gymvision',
    user: process.env.DB_USER || 'gymvision_app',
    password: process.env.DB_PASSWORD || 'gymvision_secret_2025',
  });

  try {
    await client.connect();
    const hash = await bcrypt.hash('zahra123', 12);
    await client.query(
      'INSERT INTO users (username, password_hash, role, is_active) VALUES ($1, $2, $3, $4)',
      ['zahra', hash, 'SUPER_ADMIN', true]
    );
    console.log('✅ User "zahra" created with password "zahra123"');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

createUser();
