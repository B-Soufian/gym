// ============================================
// tamesna Gym v9.0 — Payments Routes
// CdC §IX + auto ACTIVE transition
// ============================================

import { queryWithRLS, transactionWithRLS } from '../config/database.js';
import { authenticate, getRLSContext } from '../middleware/auth.js';

export default async function paymentRoutes(fastify) {

  // ─── GET /payments ────────────────────────
  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    if (request.user.role === 'STAFF') {
      rls.gymId = null; // Bypass gym isolation to see own payments across all gyms
    }
    const { page = 1, limit = 25, member_id, from, to, gym_id, search, payment_method } = request.query;
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    // Staff can see their payments across all gyms (Global View)
    if (gym_id && request.user.role !== 'STAFF') {
      conditions.push(`p.gym_id = $${idx++}`);
      params.push(gym_id);
    }
    if (member_id) { conditions.push(`p.member_id = $${idx++}`); params.push(member_id); }
    if (from) { conditions.push(`p.date_start >= $${idx++}`); params.push(from); }
    if (to) { conditions.push(`p.date_start <= $${idx++}`); params.push(to); }
    if (payment_method) { conditions.push(`p.payment_method = $${idx++}`); params.push(payment_method); }

    // STAFF can only see payments they created
    if (request.user.role === 'STAFF') {
      conditions.push(`p.staff_id = $${idx++}`);
      params.push(request.user.id);
    }

    if (search) {
      const searchTerm = search.trim();
      const isStaff = request.user.role === 'STAFF';
      let searchCondition = '';

      if (searchTerm.startsWith('+')) {
        searchCondition = isStaff ? `TRIM(m.phone) = $${idx}` : `m.phone ILIKE $${idx}`;
        params.push(isStaff ? searchTerm : `${searchTerm}%`);
      } else {
        if (isStaff) {
          searchCondition = `(
            TRIM(LOWER(CONCAT_WS(' ', TRIM(m.first_name), TRIM(m.last_name)))) = LOWER($${idx}) OR
            TRIM(LOWER(CONCAT_WS(' ', TRIM(m.last_name), TRIM(m.first_name)))) = LOWER($${idx}) OR
            TRIM(LOWER(m.custom_id)) = LOWER($${idx}) OR
            CAST(p.member_id AS TEXT) = $${idx}
          )`;
          params.push(searchTerm);
        } else {
          searchCondition = `(
            m.first_name ILIKE $${idx} OR 
            m.last_name ILIKE $${idx} OR 
            CONCAT_WS(' ', m.first_name, m.last_name) ILIKE $${idx} OR
            CONCAT_WS(' ', m.last_name, m.first_name) ILIKE $${idx} OR
            m.custom_id ILIKE $${idx} OR
            CAST(p.member_id AS TEXT) ILIKE $${idx} OR
            CAST(p.amount AS TEXT) ILIKE $${idx}
          )`;
          params.push(`%${searchTerm}%`);
        }
      }

      conditions.push(searchCondition);
      idx++;
    }

    const where = conditions.join(' AND ');
    const queryParams = [...params, parseInt(limit), offset];

    const result = await queryWithRLS(
      `SELECT p.*, s.name as subscription_name, (m.first_name || ' ' || m.last_name) as member_name
       FROM payments p
       LEFT JOIN subscriptions s ON p.subscription_id=s.id
       LEFT JOIN members m ON p.member_id=m.id
       WHERE ${where} ORDER BY p.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      queryParams, rls
    );

    const countResult = await queryWithRLS(
      `SELECT COUNT(*) FROM payments p 
       LEFT JOIN members m ON p.member_id=m.id 
       WHERE ${where}`, params, rls
    );

    return reply.send({
      payments: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  });

  // ─── GET /payments/:id ────────────────────
  fastify.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    const result = await queryWithRLS(
      `SELECT p.*, s.name as subscription_name FROM payments p
       LEFT JOIN subscriptions s ON p.subscription_id=s.id WHERE p.id=$1`,
      [request.params.id], rls
    );
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Paiement introuvable' });
    return reply.send({ payment: result.rows[0] });
  });

  // ─── POST /payments (+ ACTIVE transition) ──
  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { member_id, subscription_id, amount, payment_method, date_start, date_end, notes, is_insurance_renewal } = request.body;
      const rls = getRLSContext(request);
      if (request.user.role === 'STAFF') {
        rls.gymId = null; // Bypass gym isolation to add payments to any member
      }

      // Allow STAFF with no assigned gym to specify gym_id in body
      const gym_id = (request.user.role === 'SUPER_ADMIN' || !request.user.gym_id)
        ? (request.body.gym_id || request.user.gym_id)
        : request.user.gym_id;

      return await transactionWithRLS(rls, async (client) => {
        // Fetch subscription details for duration
        let duration = 30; // Default to 30 days for manual payments without a plan
        let final_sub_id = subscription_id || null;

        if (final_sub_id) {
          const subRes = await client.query('SELECT duration_days FROM subscriptions WHERE id=$1', [final_sub_id]);
          if (subRes.rows.length === 0) return reply.code(400).send({ error: 'Abonnement invalide' });
          duration = subRes.rows[0].duration_days;
        }

        // Calculate dates
        const startDate = date_start || new Date().toISOString().split('T')[0];
        const endDate = date_end || new Date(new Date(startDate).getTime() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Verify member exists and is not DELETED
        const memberRes = await client.query('SELECT * FROM members WHERE id=$1 FOR UPDATE', [member_id]);
        if (memberRes.rows.length === 0) return reply.code(404).send({ error: 'Membre introuvable' });
        const member = memberRes.rows[0];
        if (member.status === 'DELETED') return reply.code(400).send({ error: 'Impossible d\'enregistrer un paiement pour un membre supprimé' });

        // Determine gym_id (fallback to member's gym_id if SUPER_ADMIN and not specified)
        let final_gym_id = gym_id || member.gym_id;
        if (!final_gym_id) {
          // Ultimate fallback for legacy data or admins without an assigned gym
          const gymFallback = await client.query('SELECT id FROM gyms LIMIT 1');
          if (gymFallback.rows.length > 0) final_gym_id = gymFallback.rows[0].id;
        }

        // Create payment
        const payResult = await client.query(
          `INSERT INTO payments (member_id, gym_id, subscription_id, amount, payment_method, date_start, date_end, staff_id, staff_username_snapshot, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
          [member_id, final_gym_id, final_sub_id, amount, payment_method || 'CASH', startDate, endDate, request.user.id, request.user.username, notes]
        );

        // Transition to ACTIVE + update subscription dates
        let updateQuery = `UPDATE members SET status='ACTIVE', subscription_start=$2, subscription_end=$3, frozen_since=NULL, frozen_until=NULL`;
        if (is_insurance_renewal) {
          updateQuery += `, insurance_end = CASE WHEN insurance_end > CURRENT_DATE THEN insurance_end + INTERVAL '1 year' ELSE CURRENT_DATE + INTERVAL '1 year' END`;
        }
        updateQuery += ` WHERE id=$1`;

        await client.query(updateQuery, [member_id, startDate, endDate]);

        return reply.code(201).send({ payment: payResult.rows[0], message: 'Paiement enregistré et abonnement activé' });
      });
    } catch (err) {
      if (err.code === '22003' || err.code === '22P02') {
        return reply.code(400).send({ message: "Le montant saisi est trop élevé ou invalide." });
      }
      throw err;
    }
  });

  // ─── DELETE /payments/:id (Admin Only) ──────
  fastify.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (request.user.role !== 'SUPER_ADMIN') {
      return reply.code(403).send({ error: 'Accès refusé' });
    }
    const rls = getRLSContext(request);
    const result = await queryWithRLS('DELETE FROM payments WHERE id=$1 RETURNING id', [request.params.id], rls);
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Paiement introuvable' });
    return reply.send({ message: 'Paiement supprimé avec succès' });
  });
}
