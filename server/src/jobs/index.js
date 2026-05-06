// ============================================
// tamesna Gym v9.0 — BullMQ Jobs Setup
// Cron jobs for expiration, auto-unfreeze, queue cleanup
// CdC §4.2, §4.3
// ============================================

import { Worker } from 'bullmq';
import { query } from '../config/database.js';
import { sendSmartMessage, getWhatsAppStatus } from '../services/whatsapp.js';
import { memberJobsQueue, queueJobsQueue } from './queues.js';

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

export { memberJobsQueue, queueJobsQueue };

/**
 * Schedule recurring jobs
 */
export async function scheduleJobs() {
  // Expire members — daily at 00:01
  await memberJobsQueue.add('expire-members', {}, {
    repeat: { pattern: '1 0 * * *' }, // Every day at 00:01
    removeOnComplete: 10,
    removeOnFail: 50,
  });

  // Auto-unfreeze — daily at 00:02
  await memberJobsQueue.add('auto-unfreeze', {}, {
    repeat: { pattern: '2 0 * * *' },
    removeOnComplete: 10,
    removeOnFail: 50,
  });

  // Expire queue messages — every hour
  await queueJobsQueue.add('expire-queue', {}, {
    repeat: { pattern: '0 * * * *' },
    removeOnComplete: 10,
    removeOnFail: 50,
  });

  // Populate WhatsApp Queue — daily at 09:00
  await queueJobsQueue.add('populate-whatsapp-queue', {}, {
    repeat: { pattern: '0 9 * * *' },
    removeOnComplete: 10,
    removeOnFail: 50,
  });

  // Process sending queue — every minute
  await queueJobsQueue.add('process-sending-queue', {}, {
    repeat: { pattern: '* * * * *' },
    removeOnComplete: 10,
    removeOnFail: 50,
  });

  console.log('✅ BullMQ: recurring jobs scheduled');
}

/**
 * Start workers
 */
export function startWorkers() {
  // ─── Member Jobs Worker ────────────────────
  const memberWorker = new Worker('member-jobs', async (job) => {
    const startTime = Date.now();
    console.log(`🔄 Job: ${job.name} started`);

    try {
      if (job.name === 'expire-members') {
        // CdC §4.3: ACTIVE → EXPIRED where subscription_end < TODAY
        // NEVER auto-DELETED
        const result = await query(`
          UPDATE members SET status='EXPIRED', updated_at=NOW()
          WHERE status='ACTIVE' AND subscription_end < CURRENT_DATE
        `);
        console.log(`✅ expire-members: ${result.rowCount} members expired`);
        return { expired: result.rowCount };
      }

      if (job.name === 'auto-unfreeze') {
        // CdC §4.2: FROZEN → ACTIVE where frozen_until <= TODAY
        const result = await query(`
          UPDATE members SET
            status='ACTIVE',
            subscription_end = subscription_end + (CURRENT_DATE - frozen_since),
            frozen_days_used = frozen_days_used + (CURRENT_DATE - frozen_since),
            frozen_since = NULL,
            frozen_until = NULL,
            updated_at = NOW()
          WHERE status='FROZEN' AND frozen_until <= CURRENT_DATE
        `);
        console.log(`✅ auto-unfreeze: ${result.rowCount} members unfrozen`);
        return { unfrozen: result.rowCount };
      }
    } catch (err) {
      console.error(`❌ Job ${job.name} failed:`, err.message);
      throw err;
    }

    console.log(`⏱️ Job ${job.name} completed in ${Date.now() - startTime}ms`);
  }, {
    connection: REDIS_CONNECTION,
    concurrency: 1,
  });

  // ─── Queue Jobs Worker ─────────────────────
  const queueWorker = new Worker('queue-jobs', async (job) => {
    if (job.name === 'expire-queue') {
      const result = await query(`
        UPDATE sending_queue SET status='EXPIRED'
        WHERE status IN ('PENDING','FAILED') AND expires_at < NOW()
      `);
      console.log(`✅ expire-queue: ${result.rowCount} messages expired`);
      return { expired: result.rowCount };
    }

    if (job.name === 'populate-whatsapp-queue') {
      // 1. Populate
      const result = await query(`
        INSERT INTO sending_queue (gym_id, member_id, phone_number, message, scheduled_at)
        SELECT 
          m.gym_id, 
          m.id, 
          m.phone, 
          'Bonjour ' || m.first_name || ', votre abonnement expire le ' || m.subscription_end || '. Pensez à renouveler !',
          CURRENT_DATE
        FROM members m
        WHERE m.status = 'ACTIVE' 
        AND (m.subscription_end = CURRENT_DATE OR m.subscription_end = CURRENT_DATE + INTERVAL '2 days')
        AND NOT EXISTS (
          SELECT 1 FROM sending_queue sq 
          WHERE sq.member_id = m.id 
          AND CAST(sq.scheduled_at AS DATE) = CURRENT_DATE
        )
      `);
      console.log(`✅ populate-whatsapp-queue: ${result.rowCount} messages queued`);
    }

    if (job.name === 'process-sending-queue' || job.name === 'populate-whatsapp-queue') {
      // 2. Process Sending
      const waStatus = getWhatsAppStatus();
      if (!waStatus.ready) {
        console.warn('⚠️ WhatsApp not ready, skipping sending phase');
        return { status: 'whatsapp_not_ready' };
      }

      const pending = await query(`
        SELECT * FROM sending_queue 
        WHERE status IN ('PENDING', 'FAILED') 
        AND attempts < max_attempts 
        AND scheduled_at <= NOW()
        ORDER BY created_at ASC
      `);

      for (const item of pending.rows) {
        try {
          await query(`UPDATE sending_queue SET status='SENDING' WHERE id=$1`, [item.id]);
          const delay = await sendSmartMessage(item.phone_number, item.message);
          await query(`UPDATE sending_queue SET status='SENT', sent_at=NOW() WHERE id=$1`, [item.id]);
          console.log(`✅ Smart Send Success: ${item.phone_number}. Waiting ${Math.round(delay / 1000)}s...`);
          await new Promise(r => setTimeout(r, delay));
        } catch (err) {
          await query(`
            UPDATE sending_queue SET 
              status='FAILED', 
              attempts=attempts+1, 
              failed_reason=$2 
            WHERE id=$1`, [item.id, err.message]);
        }
      }
      return { status: 'completed' };
    }
  }, {
    connection: REDIS_CONNECTION,
    concurrency: 1,
  });

  memberWorker.on('failed', (job, err) => {
    console.error(`❌ Worker: job ${job?.name} failed:`, err.message);
  });

  queueWorker.on('failed', (job, err) => {
    console.error(`❌ Worker: job ${job?.name} failed:`, err.message);
  });

  console.log('✅ BullMQ: workers started');
  return { memberWorker, queueWorker };
}
