// ============================================
// tamesna Gym v9.0 — Gyms Routes
// CRUD (SUPER_ADMIN only) | CdC §IX
// ============================================

import { queryWithRLS, query } from '../config/database.js';
import { authenticate, getRLSContext } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

export default async function gymRoutes(fastify) {
  fastify.get('/', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    // Direct query to ensure staff can see the gyms list for member registration
    const result = await query(
      `SELECT g.id, g.name, g.address, g.phone, g.logo_url, g.is_active, g.deleted_at, g.created_at, g.updated_at,
        (SELECT COUNT(*)::INT FROM members WHERE gym_id = g.id AND status = 'ACTIVE') as active_members_count
       FROM gyms g WHERE g.deleted_at IS NULL ORDER BY g.name`
    );
    return reply.send({ gyms: result.rows, total: result.rows.length });
  });

  fastify.get('/:id', {
    preHandler: [authenticate, requireRole('SUPER_ADMIN')],
  }, async (request, reply) => {
    const rls = getRLSContext(request);
    const result = await queryWithRLS('SELECT id, name, address, phone, logo_url, is_active FROM gyms WHERE id = $1', [request.params.id], rls);
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Salle introuvable' });
    const stats = await queryWithRLS(
      `SELECT
        (SELECT COUNT(*) FROM members WHERE gym_id=$1 AND status='ACTIVE') AS active_members,
        (SELECT COUNT(*) FROM members WHERE gym_id=$1 AND status='FROZEN') AS frozen_members,
        (SELECT COUNT(*) FROM members WHERE gym_id=$1 AND status='EXPIRED') AS expired_members,
        (SELECT COALESCE(SUM(amount),0) FROM payments WHERE gym_id=$1 AND date_start>=date_trunc('month',CURRENT_DATE)) AS revenue_this_month`,
      [request.params.id], rls
    );
    return reply.send({ gym: result.rows[0], stats: stats.rows[0] });
  });

  fastify.post('/', {
    preHandler: [authenticate, requireRole('SUPER_ADMIN')],
    schema: {
      body: {
        type: 'object', required: ['name'], properties: {
          name: { type: 'string', minLength: 2 }, address: { type: 'string' },
          phone: { type: 'string' }, logo_url: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { name, address, phone, logo_url } = request.body;
      const rls = getRLSContext(request);
      const result = await queryWithRLS(
        `INSERT INTO gyms (name, address, phone, logo_url) VALUES ($1,$2,$3,$4) RETURNING *`,
        [name, address, phone, logo_url], rls
      );
      return reply.code(201).send({ gym: result.rows[0] });
    } catch (err) {
      if (err.code === '22003' || err.code === '22P02') {
        return reply.code(400).send({ message: "Les données saisies sont invalides ou trop volumineuses." });
      }
      throw err;
    }
  });

  fastify.put('/:id', {
    preHandler: [authenticate, requireRole('SUPER_ADMIN')],
  }, async (request, reply) => {
    try {
      const { name, address, phone, logo_url, is_active } = request.body;
      const rls = getRLSContext(request);
      const result = await queryWithRLS(
        `UPDATE gyms SET name=COALESCE($2,name), address=COALESCE($3,address), phone=COALESCE($4,phone),
         logo_url=COALESCE($5,logo_url), is_active=COALESCE($6,is_active)
         WHERE id=$1 AND deleted_at IS NULL RETURNING *`,
        [request.params.id, name, address, phone, logo_url, is_active], rls
      );
      if (result.rows.length === 0) return reply.code(404).send({ error: 'Salle introuvable' });
      return reply.send({ gym: result.rows[0] });
    } catch (err) {
      if (err.code === '22003' || err.code === '22P02') {
        return reply.code(400).send({ message: "Les données saisies sont invalides ou trop volumineuses." });
      }
      throw err;
    }
  });

  fastify.delete('/:id', {
    preHandler: [authenticate, requireRole('SUPER_ADMIN')],
  }, async (request, reply) => {
    const rls = getRLSContext(request);
    const result = await queryWithRLS(
      `UPDATE gyms SET deleted_at=NOW(), is_active=FALSE WHERE id=$1 AND deleted_at IS NULL RETURNING id, name`,
      [request.params.id], rls
    );
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Salle introuvable' });
    return reply.send({ message: 'Salle supprimée (soft delete)', gym: result.rows[0] });
  });
}
