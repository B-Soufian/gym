// ============================================
// tamesna Gym v9.0 — Subscriptions Routes
// ============================================

import { queryWithRLS, query } from '../config/database.js';
import { authenticate, getRLSContext } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

export default async function subscriptionRoutes(fastify) {
  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    // We use the system query to bypass RLS so staff can see all active plans
    const result = await query(
      'SELECT * FROM subscriptions WHERE is_active=TRUE ORDER BY price ASC'
    );
    return reply.send({ subscriptions: result.rows });
  });

  fastify.post('/', {
    preHandler: [authenticate, requireRole('SUPER_ADMIN')],
  }, async (request, reply) => {
    try {
      const { name, duration_days, price, gym_id } = request.body;
      const rls = getRLSContext(request);
      const result = await queryWithRLS(
        'INSERT INTO subscriptions (name, duration_days, price, gym_id) VALUES ($1,$2,$3,$4) RETURNING *',
        [name, duration_days, price, gym_id], rls
      );
      return reply.code(201).send({ subscription: result.rows[0] });
    } catch (err) {
      if (err.code === '22003' || err.code === '22P02') {
        return reply.code(400).send({ message: "Le prix ou la durée est trop élevé." });
      }
      throw err;
    }
  });

  fastify.put('/:id', {
    preHandler: [authenticate, requireRole('SUPER_ADMIN')],
  }, async (request, reply) => {
    try {
      const { name, duration_days, price, is_active } = request.body;
      const rls = getRLSContext(request);
      const result = await queryWithRLS(
        `UPDATE subscriptions SET name=COALESCE($2,name), duration_days=COALESCE($3,duration_days),
         price=COALESCE($4,price), is_active=COALESCE($5,is_active) WHERE id=$1 RETURNING *`,
        [request.params.id, name, duration_days, price, is_active], rls
      );
      if (result.rows.length === 0) return reply.code(404).send({ error: 'Plan introuvable' });
      return reply.send({ subscription: result.rows[0] });
    } catch (err) {
      if (err.code === '22003' || err.code === '22P02') {
        return reply.code(400).send({ message: "Le prix ou la durée est trop élevé." });
      }
      throw err;
    }
  });

  fastify.delete('/:id', {
    preHandler: [authenticate, requireRole('SUPER_ADMIN')],
  }, async (request, reply) => {
    const rls = getRLSContext(request);
    const result = await queryWithRLS(
      'UPDATE subscriptions SET is_active=FALSE WHERE id=$1 RETURNING id, name',
      [request.params.id], rls
    );
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Plan introuvable' });
    return reply.send({ message: 'Plan désactivé', subscription: result.rows[0] });
  });
}
