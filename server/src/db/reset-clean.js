import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

async function reset() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'gymvision',
    user: process.env.DB_USER || 'gymvision_app',
    password: process.env.DB_PASSWORD || 'gymvision_secret_2025',
  });

  try {
    await client.connect();
    console.log('🔄 Connected to database for reset...');

    // 1. Wipe everything
    console.log('🧹 Wiping database tables...');
    await client.query(`
      DO $$ DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
          FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
              EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
          END LOOP;
      END $$;
    `);

    // 2. Get migration files
    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir).sort();

    // 3. Run migrations (skipping 004 seed data)
    for (const file of files) {
      if (file === '004_seed_data.sql') continue;
      console.log(`📄 Running migration: ${file}`);
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      await client.query(sql);
    }

    // 4. Create the custom user
    console.log('👤 Creating user: ihssane...');
    const passwordHash = await bcrypt.hash('ihssane@2026', 12);

    // We need at least one gym for many foreign keys, even if SUPER_ADMIN doesn't have one
    await client.query("INSERT INTO gyms (name, address) VALUES ('tamesna Gym', 'Default Address')");

    await client.query(
      'INSERT INTO users (username, password_hash, role, gym_id) VALUES ($1, $2, $3, $4)',
      ['ihssane', passwordHash, 'SUPER_ADMIN', null]
    );

    console.log('✨ Database reset and seeded with user "ihssane"!');
  } catch (err) {
    console.error('❌ Reset failed:', err);
  } finally {
    await client.end();
  }
}

reset();
