import { query } from './src/config/database.js';

async function run() {
  try {
    console.log('Dropping chk_role_gym constraint...');
    await query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_role_gym;`);

    console.log('Updating RLS policies to treat STAFF like SUPER_ADMIN in terms of bypassing gym_id lock...');
    
    const tables = ['members', 'payments', 'subscriptions', 'users', 'sending_queue', 'audit_logs'];
    
    for (const table of tables) {
      let policyName = '';
      if (table === 'members') policyName = 'gym_isolation_members';
      if (table === 'payments') policyName = 'gym_isolation_payments';
      if (table === 'subscriptions') policyName = 'gym_isolation_subscriptions';
      if (table === 'users') policyName = 'gym_isolation_users';
      if (table === 'sending_queue') policyName = 'gym_isolation_queue';
      if (table === 'audit_logs') policyName = 'gym_isolation_audit';

      if (policyName) {
        console.log(`Updating policy ${policyName} on ${table}...`);
        await query(`DROP POLICY IF EXISTS ${policyName} ON ${table};`);
        
        let usingClause = `gym_id = current_setting('app.current_gym_id', TRUE)::INT OR current_setting('app.current_role', TRUE) IN ('SUPER_ADMIN', 'STAFF')`;
        if (table === 'users') {
          usingClause = `gym_id = current_setting('app.current_gym_id', TRUE)::INT OR gym_id IS NULL OR current_setting('app.current_role', TRUE) IN ('SUPER_ADMIN', 'STAFF')`;
        }

        await query(`
          CREATE POLICY ${policyName} ON ${table}
          USING (
              ${usingClause}
          );
        `);
      }
    }
    
    console.log('Successfully updated database constraints and RLS policies!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
