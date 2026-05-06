import bcrypt from 'bcrypt';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://gymvision_app:gymvision_secret_2025@localhost:5432/gymvision'
});

async function run() {
  try {
    await client.connect();
    const hash = await bcrypt.hash('Admin@2026', 12);
    
    // Match your schema: SUPER_ADMIN role and no full_name column
    await client.query(`
      INSERT INTO users (username, password_hash, role) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = $2, role = $3
    `, ['admin', hash, 'SUPER_ADMIN']);
    
    console.log('✅ User "admin" created/updated successfully with role "SUPER_ADMIN"');
  } catch (err) {
    console.error('❌ Error creating user:', err.message);
  } finally {
    await client.end();
  }
}

run();
