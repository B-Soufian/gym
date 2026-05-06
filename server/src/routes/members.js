// ============================================
// tamesna Gym v9.0 — Members Routes
// CRUD + freeze/unfreeze | CdC §IX, §4
// ============================================

import { queryWithRLS, transactionWithRLS } from '../config/database.js';
import { authenticate, getRLSContext } from '../middleware/auth.js';

// State machine transitions (CdC §4.1)
const VALID_TRANSITIONS = {
  ACTIVE: ['FROZEN', 'EXPIRED', 'DELETED'],
  FROZEN: ['ACTIVE', 'EXPIRED', 'DELETED'],
  EXPIRED: ['ACTIVE', 'DELETED'],  // ACTIVE only via new payment
  DELETED: [],                      // Terminal state
};

export default async function memberRoutes(fastify) {

  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    if (request.user.role === 'STAFF') {
      rls.gymId = null; // Bypass gym isolation to search all members
    }

    // Auto-update expired memberships before fetching (CdC §4.1)
    await queryWithRLS(
      `UPDATE members 
       SET status = 'EXPIRED' 
       WHERE status = 'ACTIVE' 
       AND (subscription_end IS NULL OR subscription_end < CURRENT_DATE)`,
      [], rls
    );

    const { status, search, page = 1, limit = 25, gym_id } = request.query;
    const offset = (page - 1) * limit;

    const conditions = ["status != 'DELETED'"];
    const params = [];
    let idx = 1;

    // Staff can search all members across all gyms (Global Search)
    if (gym_id && request.user.role !== 'STAFF') {
      conditions.push(`gym_id = $${idx++}`);
      params.push(gym_id);
    }

    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }

    if (search) {
      const searchTerm = search.trim();
      const isStaff = request.user.role === 'STAFF';
      let searchCondition = '';

      if (isStaff) {
        // Exact match for ID, custom_id, or FULL NAME (Blind Search Privacy)
        searchCondition = `(
          TRIM(LOWER(custom_id)) = LOWER($${idx}) OR
          CAST(id AS TEXT) = $${idx} OR
          TRIM(LOWER(CONCAT_WS(' ', TRIM(first_name), TRIM(last_name)))) = LOWER($${idx}) OR
          TRIM(LOWER(CONCAT_WS(' ', TRIM(last_name), TRIM(first_name)))) = LOWER($${idx})
        )`;
        params.push(searchTerm);
      } else {
        // Admin search (includes MANAGER)
        searchCondition = `(
          first_name ILIKE $${idx} OR 
          last_name ILIKE $${idx} OR 
          CONCAT_WS(' ', first_name, last_name) ILIKE $${idx} OR
          CONCAT_WS(' ', last_name, first_name) ILIKE $${idx} OR
          custom_id ILIKE $${idx} OR
          CAST(id AS TEXT) ILIKE $${idx} OR
          phone ILIKE $${idx}
        )`;
        params.push(`%${searchTerm}%`);
      }

      conditions.push(searchCondition);
      idx++;
    }

    const where = conditions.join(' AND ');
    const queryParams = [...params, parseInt(limit), offset];

    const result = await queryWithRLS(
      `SELECT * FROM members WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`, queryParams, rls
    );
    const countResult = await queryWithRLS(`SELECT COUNT(*) FROM members WHERE ${where}`, params, rls);

    const isStaff = request.user.role === 'STAFF';
    const rows = result.rows.map(m => {
      if (isStaff && m.phone) {
        m.phone = m.phone.length > 4
          ? `${m.phone.substring(0, 2)}****${m.phone.substring(m.phone.length - 2)}`
          : '****';
      }
      return m;
    });

    return reply.send({
      members: rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  });

  // ─── GET /members/expiring ────────────────
  fastify.get('/expiring', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    const { gym_id } = request.query;

    let query = `SELECT * FROM members 
       WHERE status != 'DELETED' 
       AND subscription_end BETWEEN CURRENT_DATE - INTERVAL '3 days' AND CURRENT_DATE + INTERVAL '7 days'`;
    const params = [];

    if (gym_id) {
      query += ` AND gym_id = $1`;
      params.push(gym_id);
    }

    query += ` ORDER BY subscription_end`;

    const result = await queryWithRLS(query, params, rls);
    return reply.send({ members: result.rows, total: result.rows.length });
  });

  // ─── GET /members/:id ─────────────────────
  fastify.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    if (request.user.role === 'STAFF') {
      rls.gymId = null; // Bypass gym isolation to view any member
    }

    // Auto-update if expired before showing details
    await queryWithRLS(
      `UPDATE members SET status = 'EXPIRED' 
       WHERE id = $1 AND status = 'ACTIVE' 
       AND (subscription_end IS NULL OR subscription_end < CURRENT_DATE)`,
      [request.params.id], rls
    );

    const result = await queryWithRLS('SELECT m.*, g.name as gym_name FROM members m LEFT JOIN gyms g ON m.gym_id = g.id WHERE m.id=$1', [request.params.id], rls);
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Membre introuvable' });

    const member = result.rows[0];
    if (request.user.role === 'STAFF' && member.phone) {
      member.phone = member.phone.length > 4
        ? `${member.phone.substring(0, 2)}****${member.phone.substring(member.phone.length - 2)}`
        : '****';
    }

    // Get payment history
    const payments = await queryWithRLS(
      'SELECT p.*, s.name as subscription_name FROM payments p LEFT JOIN subscriptions s ON p.subscription_id=s.id WHERE p.member_id=$1 ORDER BY p.created_at DESC',
      [request.params.id], rls
    );
    return reply.send({ member, payments: payments.rows });
  });

  // ─── POST /members ────────────────────────
  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { first_name, last_name, phone, email, gender, date_of_birth, notes, subscription_start, subscription_end, custom_id, registration_date, subscription_id, has_insurance } = request.body;
    const rls = getRLSContext(request);

    // Determine gym_id
    let final_gym_id = (request.user.role === 'SUPER_ADMIN' || !request.user.gym_id)
      ? (request.body.gym_id || request.user.gym_id)
      : request.user.gym_id;

    if (!final_gym_id) {
      const gymFallback = await queryWithRLS('SELECT id FROM gyms LIMIT 1', [], rls);
      if (gymFallback.rows.length > 0) final_gym_id = gymFallback.rows[0].id;
    }

    // Validate registration_date if provided
    let created_at_value = null;
    if (registration_date) {
      const parsed = new Date(registration_date);
      if (!isNaN(parsed.getTime())) created_at_value = parsed.toISOString();
    }

    // Determine initial status
    let initial_status = 'EXPIRED';
    if (subscription_end) {
      const endDate = new Date(subscription_end);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (endDate >= today) initial_status = 'ACTIVE';
    }

    return await transactionWithRLS(rls, async (client) => {
      try {
        // [CHECK] Check if first_name + last_name already exists for this gym (and is not deleted)
        const nameCheck = await client.query(
          "SELECT id FROM members WHERE first_name ILIKE $1 AND last_name ILIKE $2 AND status != 'DELETED' AND gym_id = $3 LIMIT 1",
          [first_name.trim(), last_name.trim(), final_gym_id]
        );
        if (nameCheck.rows.length > 0) {
          return reply.code(409).send({ error: "Ce membre (Prénom + Nom) existe déjà dans cette salle." });
        }

        let insuranceEnd = null;
        if (has_insurance) {
          const insDate = new Date(registration_date || Date.now());
          insDate.setFullYear(insDate.getFullYear() + 1);
          insuranceEnd = insDate.toISOString().split('T')[0];
        }

        const memberResult = await client.query(
          `INSERT INTO members (first_name, last_name, phone, email, gender, date_of_birth, gym_id, notes, subscription_start, subscription_end, custom_id, created_at, status, insurance_end)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, COALESCE($12::timestamptz, NOW()), $13, $14) RETURNING *`,
          [first_name, last_name, phone, email, gender, date_of_birth, final_gym_id, notes, subscription_start, subscription_end, custom_id, created_at_value, initial_status, insuranceEnd]
        );
        const member = memberResult.rows[0];

        if (has_insurance) {
          const startDate = subscription_start || new Date().toISOString().split('T')[0];
          await client.query(
            `INSERT INTO payments (member_id, gym_id, amount, payment_method, date_start, date_end, staff_id, staff_username_snapshot, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [member.id, final_gym_id, 100, 'CASH', startDate, insuranceEnd, request.user.id, request.user.username, 'Frais Assurance Annuelle']
          );
        }

        // If a subscription was selected, create a payment record
        if (subscription_id) {
          const subRes = await client.query('SELECT price FROM subscriptions WHERE id = $1', [subscription_id]);
          if (subRes.rows.length > 0) {
            const price = subRes.rows[0].price;
            await client.query(
              `INSERT INTO payments (member_id, gym_id, subscription_id, amount, payment_method, date_start, date_end, staff_id, staff_username_snapshot)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [member.id, final_gym_id, subscription_id, price, 'CASH', subscription_start, subscription_end, request.user.id, request.user.username]
            );
          }
        }

        return reply.code(201).send({ member });
      } catch (err) {
        if (err.code === '23505') {
          const detail = err.detail || '';
          if (detail.includes('phone')) {
            return reply.code(409).send({ error: "Ce numéro de téléphone est déjà utilisé par un autre membre." });
          } else if (detail.includes('custom_id')) {
            return reply.code(409).send({ error: "Cet ID Unique (Badge) est déjà utilisé par un autre membre." });
          }
          return reply.code(409).send({ error: "Cette donnée est déjà utilisée par un autre membre." });
        }
        if (err.code === '22003' || err.code === '22P02') {
          return reply.code(400).send({ error: "Format invalide ou valeur trop élevée (le téléphone et l'ID ne doivent contenir que des chiffres)." });
        }
        throw err;
      }
    });
  });

  // ─── PUT /members/:id ─────────────────────
  fastify.put('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { first_name, last_name, phone, email, gender, date_of_birth, notes, custom_id, insurance_end } = request.body;
    const rls = getRLSContext(request);
    if (request.user.role === 'STAFF') {
      rls.gymId = null; // Bypass gym isolation to update any member
    }
    try {
      const result = await queryWithRLS(
        `UPDATE members SET 
         first_name=COALESCE($2,first_name), 
         last_name=COALESCE($3,last_name),
         phone=COALESCE($4,phone), 
         email=COALESCE($5,email), 
         gender=COALESCE($6,gender),
         date_of_birth=COALESCE($7,date_of_birth), 
         notes=COALESCE($8,notes),
         custom_id=COALESCE($9,custom_id),
         insurance_end=$10
         WHERE id=$1 AND status!='DELETED' RETURNING *`,
        [request.params.id, first_name, last_name, phone, email, gender, date_of_birth, notes, custom_id, insurance_end || null], rls
      );
      if (result.rows.length === 0) return reply.code(404).send({ error: 'Membre introuvable' });
      return reply.send({ member: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        const detail = err.detail || '';
        if (detail.includes('phone')) {
          return reply.code(409).send({ error: "Ce numéro de téléphone est déjà utilisé par un autre membre." });
        } else if (detail.includes('custom_id')) {
          return reply.code(409).send({ error: "Cet ID Unique (Badge) est déjà utilisé par un autre membre." });
        }
        return reply.code(409).send({ error: "Cette donnée est déjà utilisée par un autre membre." });
      }
      if (err.code === '22003' || err.code === '22P02') {
        return reply.code(400).send({ error: "Format invalide ou valeur trop élevée (le téléphone et l'ID ne doivent contenir que des chiffres)." });
      }
      throw err;
    }
  });

  // ─── DELETE /members/:id (soft → DELETED) ──
  fastify.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    const result = await queryWithRLS(
      `UPDATE members SET 
        status='DELETED', 
        deleted_at=NOW(), 
        deleted_by=$2,
        phone = CONCAT('del-', id),
        custom_id = CASE WHEN custom_id IS NOT NULL THEN CONCAT('del-', id) ELSE NULL END
       WHERE id=$1 AND status!='DELETED' RETURNING id, first_name, last_name`,
      [request.params.id, request.user.id], rls
    );
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Membre introuvable ou déjà supprimé' });
    return reply.send({ message: 'Membre supprimé', member: result.rows[0] });
  });

  // ─── POST /members/:id/freeze (CdC §4.2) ──
  fastify.post('/:id/freeze', { preHandler: [authenticate] }, async (request, reply) => {
    const { days } = request.body; // Number of days to freeze
    if (!days || days < 1) return reply.code(400).send({ error: 'Nombre de jours requis (min 1)' });

    const rls = getRLSContext(request);
    return await transactionWithRLS(rls, async (client) => {
      const memberRes = await client.query('SELECT * FROM members WHERE id=$1 FOR UPDATE', [request.params.id]);
      if (memberRes.rows.length === 0) return reply.code(404).send({ error: 'Membre introuvable' });

      const member = memberRes.rows[0];
      if (member.status !== 'ACTIVE') return reply.code(400).send({ error: `Transition FREEZE impossible depuis ${member.status}` });
      if (member.frozen_days_used + days > member.max_freeze_days) {
        return reply.code(400).send({
          error: 'Quota de gel épuisé',
          remaining: member.max_freeze_days - member.frozen_days_used,
        });
      }

      const result = await client.query(
        `UPDATE members SET status='FROZEN', frozen_since=CURRENT_DATE, frozen_until=CURRENT_DATE + $2 * INTERVAL '1 day'
         WHERE id=$1 RETURNING *`,
        [request.params.id, days]
      );
      return reply.send({ message: 'Abonnement gelé', member: result.rows[0] });
    });
  });

  // ─── POST /members/:id/unfreeze (CdC §4.2) ─
  fastify.post('/:id/unfreeze', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    return await transactionWithRLS(rls, async (client) => {
      const memberRes = await client.query('SELECT * FROM members WHERE id=$1 FOR UPDATE', [request.params.id]);
      if (memberRes.rows.length === 0) return reply.code(404).send({ error: 'Membre introuvable' });

      const member = memberRes.rows[0];
      if (member.status !== 'FROZEN') return reply.code(400).send({ error: 'Ce membre n\'est pas gelé' });

      const result = await client.query(
        `UPDATE members SET status='ACTIVE',
         subscription_end = subscription_end + (CURRENT_DATE - frozen_since),
         frozen_days_used = frozen_days_used + (CURRENT_DATE - frozen_since),
         frozen_since=NULL, frozen_until=NULL
         WHERE id=$1 RETURNING *`,
        [request.params.id]
      );
      return reply.send({ message: 'Abonnement dégelé', member: result.rows[0] });
    });
  });
}
