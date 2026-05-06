// ============================================
// tamesna Gym v9.0 — Queue Routes
// WhatsApp sending queue | CdC §VII
// ============================================

import { queryWithRLS } from '../config/database.js';
import { authenticate, getRLSContext } from '../middleware/auth.js';
import { queueJobsQueue } from '../jobs/queues.js';

export default async function queueRoutes(fastify) {
  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    const { status } = request.query;
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND sq.status=$1'; params.push(status); }

    const result = await queryWithRLS(
      `SELECT sq.*, m.first_name, m.last_name FROM sending_queue sq
       LEFT JOIN members m ON sq.member_id=m.id WHERE ${where} ORDER BY sq.scheduled_at DESC`,
      params, rls
    );
    return reply.send({ queue: result.rows, total: result.rows.length });
  });

  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { member_id, phone_number, message, gym_id } = request.body;
    const rls = getRLSContext(request);

    const result = await queryWithRLS(
      `INSERT INTO sending_queue (gym_id, member_id, phone_number, message) VALUES ($1,$2,$3,$4) RETURNING *`,
      [gym_id, member_id, phone_number, message], rls
    );
    return reply.code(201).send({ message_queued: result.rows[0] });
  });

  // Manual sync (trigger population)
  fastify.post('/sync', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await queryWithRLS(`
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
    `, [], getRLSContext(request));
    return reply.send({ message: 'Queue synchronisée', count: result.rowCount });
  });

  // WhatsApp connection status
  fastify.get('/whatsapp-status', { preHandler: [authenticate] }, async (request, reply) => {
    const { getWhatsAppStatus } = await import('../services/whatsapp.js');
    const status = getWhatsAppStatus();
    return reply.send(status);
  });

  // WhatsApp QR code image for frontend scanning
  fastify.get('/whatsapp-qr', { preHandler: [authenticate] }, async (request, reply) => {
    const { getQRCode, getWhatsAppStatus } = await import('../services/whatsapp.js');
    const status = getWhatsAppStatus();
    const qr = getQRCode();
    return reply.send({ qr, status: status.status, ready: status.ready, error: status.error });
  });

  // Retry WhatsApp connection
  fastify.post('/whatsapp-retry', { preHandler: [authenticate] }, async (request, reply) => {
    const { retryWhatsApp } = await import('../services/whatsapp.js');
    const result = await retryWhatsApp();
    return reply.send(result);
  });

  // Disconnect WhatsApp (owner action — clears session, forces new QR)
  fastify.post('/whatsapp-disconnect', { preHandler: [authenticate] }, async (request, reply) => {
    const { disconnectWhatsApp, initWhatsApp } = await import('../services/whatsapp.js');
    const result = await disconnectWhatsApp();
    // Re-init in background so a fresh QR is generated
    setTimeout(() => initWhatsApp(), 800);
    return reply.send(result);
  });

  // Manual send trigger (Smart Engine)
  fastify.post('/process', { preHandler: [authenticate] }, async (request, reply) => {
    const { getWhatsAppStatus } = await import('../services/whatsapp.js');
    const status = getWhatsAppStatus();
    if (!status.ready) {
      return reply.code(503).send({
        error: 'WhatsApp non connecté',
        message: 'Scannez le QR code dans le terminal du serveur pour connecter WhatsApp.',
        status
      });
    }
    await queueJobsQueue.add('process-sending-queue', { manual: true });
    return reply.send({ message: 'Processus d\'envoi démarré' });
  });

  // Manual send confirmation (wa.me mode)
  fastify.post('/:id/send', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    const result = await queryWithRLS(
      `UPDATE sending_queue SET status='SENT', sent_at=NOW() WHERE id=$1 AND status IN ('PENDING','SENDING') RETURNING *`,
      [request.params.id], rls
    );
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Message introuvable' });
    return reply.send({ message: 'Envoi confirmé', item: result.rows[0] });
  });

  fastify.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    const result = await queryWithRLS(
      `DELETE FROM sending_queue WHERE id=$1 AND status='PENDING' RETURNING id`,
      [request.params.id], rls
    );
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Message introuvable ou déjà traité' });
    return reply.send({ message: 'Message annulé' });
  });
}
