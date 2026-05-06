// ============================================
// Lakhlifi Gym v9.0 — Audit Routes
// CdC §VIII, §IX
// ============================================

import { queryWithRLS } from '../config/database.js';
import { authenticate, getRLSContext } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

export default async function auditRoutes(fastify) {
  // Full audit log (SUPER_ADMIN only)
  fastify.get('/', {
    preHandler: [authenticate, requireRole('SUPER_ADMIN')],
  }, async (request, reply) => {
    const rls = getRLSContext(request);
    const { page = 1, limit = 50, action_type, target_table } = request.query;
    const offset = (page - 1) * limit;
    let where = '1=1';
    const params = [];
    let idx = 1;

    if (action_type) { where += ` AND action_type=$${idx++}`; params.push(action_type); }
    if (target_table) { where += ` AND target_table=$${idx++}`; params.push(target_table); }

    params.push(limit, offset);
    const result = await queryWithRLS(
      `SELECT 
        a.*,
        CASE 
          WHEN a.target_table = 'members' THEN (SELECT first_name || ' ' || last_name FROM members WHERE id = a.target_id)
          WHEN a.target_table = 'payments' THEN (SELECT m.first_name || ' ' || m.last_name FROM payments p JOIN members m ON p.member_id = m.id WHERE p.id = a.target_id)
          WHEN a.target_table = 'gyms' THEN (SELECT name FROM gyms WHERE id = a.target_id)
          WHEN a.target_table = 'subscriptions' THEN (SELECT name FROM subscriptions WHERE id = a.target_id)
          ELSE NULL 
        END as target_name
       FROM audit_logs a 
       WHERE ${where} 
       ORDER BY a.created_at DESC 
       LIMIT $${idx++} OFFSET $${idx}`,
      params, rls
    );
    return reply.send({ logs: result.rows, page: parseInt(page) });
  });

  // Own audit log (any authenticated user)
  fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    const result = await queryWithRLS(
      'SELECT * FROM audit_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',
      [request.user.id], rls
    );
    return reply.send({ logs: result.rows });
  });

  // User listing (SUPER_ADMIN or gym manager)
  fastify.get('/users', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    const result = await queryWithRLS(
      'SELECT u.id, u.username, u.role, u.is_active, g.name as gym_name FROM users u LEFT JOIN gyms g ON u.gym_id = g.id ORDER BY u.role, u.username',
      [], rls
    );
    return reply.send({ users: result.rows });
  });

  // User creation
  fastify.post('/users', { preHandler: [authenticate, requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    try {
      const { username, password, role } = request.body;
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.default.hash(password, 12);
      const rls = getRLSContext(request);

      const result = await queryWithRLS(
        'INSERT INTO users (username, password_hash, role, gym_id) VALUES ($1,$2,$3,$4) RETURNING id, username, role',
        [username, hash, role, role === 'SUPER_ADMIN' ? null : request.body.gym_id], rls
      );
      return reply.code(201).send({ user: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(409).send({ message: "Ce nom d'utilisateur est déjà utilisé." });
      }
      if (err.code === '22003' || err.code === '22P02') {
        return reply.code(400).send({ message: "Données invalides ou valeur trop élevée." });
      }
      throw err;
    }
  });

  // User deletion
  fastify.delete('/users/:id', { preHandler: [authenticate, requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params;
    const rls = getRLSContext(request);
    await queryWithRLS('DELETE FROM users WHERE id = $1', [id], rls);
    return reply.send({ success: true });
  });

  // User update
  fastify.put('/users/:id', { preHandler: [authenticate, requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { username, role, password, is_active } = request.body;
      const rls = getRLSContext(request);

      let query = 'UPDATE users SET username=$1, role=$2, is_active=$3';
      const params = [username, role, is_active];
      let idx = 4;

      if (password && password.trim() !== '') {
        const bcrypt = await import('bcrypt');
        const hash = await bcrypt.default.hash(password, 12);
        query += `, password_hash=$${idx++}`;
        params.push(hash);
      }

      query += ` WHERE id=$${idx} RETURNING id, username, role, is_active`;
      params.push(id);

      const result = await queryWithRLS(query, params, rls);
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Utilisateur non trouvé' });
      }

      return reply.send({ user: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(409).send({ message: "Ce nom d'utilisateur est déjà utilisé." });
      }
      throw err;
    }
  });
}
