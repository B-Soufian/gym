// ============================================
// Lakhlifi Gym v9.0 — Migration Runner
// ============================================

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const { Client } = pg;

const MIGRATIONS = [
  '001_create_tables.sql',
  '002_enable_rls.sql',
  '003_create_triggers.sql',
  '004_seed_data.sql',
  '005_add_custom_id.sql',
  '006_unique_phone.sql',
  '007_add_insurance.sql',
];

async function migrate() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'gymvision',
    user: process.env.DB_USER || 'gymvision_app',
    password: process.env.DB_PASSWORD || 'gymvision_secret_2025',
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

    for (const file of MIGRATIONS) {
      console.log(`\n📄 Running: ${file}`);
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      try {
        await client.query(sql);
        console.log(`✅ ${file} — completed`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('multiple primary keys') || err.message.includes('duplicate key')) {
          console.log(`⚠️ ${file} — skipped (already applied)`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n🎉 All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
