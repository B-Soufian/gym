// ============================================
// tamesna Gym v9.0 — Reports Routes
// Revenue, Churn Rate, KPIs | CdC §VI
// ============================================

import { queryWithRLS } from '../config/database.js';
import { authenticate, getRLSContext } from '../middleware/auth.js';

export default async function reportRoutes(fastify) {

  // ─── GET /reports/kpis ────────────────────
  fastify.get('/kpis', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);

    // Auto-update expired memberships before calculating KPIs
    await queryWithRLS(
      `UPDATE members SET status = 'EXPIRED' 
       WHERE status = 'ACTIVE' 
       AND (subscription_end IS NULL OR subscription_end < CURRENT_DATE)`,
      [], rls
    );

    console.log('📊 KPI Request - User:', request.user.username, 'Role:', request.user.role, 'Gym:', request.user.gym_id);
    const gymFilter = request.query.gym_id || null;

    const queryStr = `
      WITH current_stats AS (
        SELECT
          (SELECT COUNT(*)::NUMERIC FROM members WHERE status='ACTIVE' ${gymFilter ? 'AND gym_id=' + gymFilter : ''}) AS active_members,
          (SELECT COUNT(*)::NUMERIC FROM members WHERE status='FROZEN' ${gymFilter ? 'AND gym_id=' + gymFilter : ''}) AS frozen_members,
          (SELECT COUNT(*)::NUMERIC FROM members WHERE status='EXPIRED' ${gymFilter ? 'AND gym_id=' + gymFilter : ''}) AS expired_members,
          (SELECT COUNT(*)::NUMERIC FROM members WHERE created_at>=date_trunc('month',CURRENT_DATE) ${gymFilter ? 'AND gym_id=' + gymFilter : ''}) AS new_members_this_month,
          (SELECT COALESCE(SUM(amount),0)::NUMERIC FROM payments WHERE created_at>=date_trunc('month',CURRENT_DATE) ${gymFilter ? 'AND gym_id=' + gymFilter : ''}) AS revenue_this_month,
          (SELECT COUNT(*)::NUMERIC FROM members WHERE status='ACTIVE' AND subscription_end BETWEEN CURRENT_DATE AND CURRENT_DATE+7 ${gymFilter ? 'AND gym_id=' + gymFilter : ''}) AS expiring_soon
      ),
      last_month_stats AS (
        SELECT
          (SELECT COUNT(*)::NUMERIC FROM members WHERE status='ACTIVE' AND created_at < date_trunc('month', CURRENT_DATE) ${gymFilter ? 'AND gym_id=' + gymFilter : ''}) AS active_last_month,
          (SELECT COUNT(*)::NUMERIC FROM members WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < date_trunc('month', CURRENT_DATE) ${gymFilter ? 'AND gym_id=' + gymFilter : ''}) AS new_members_last_month,
          (SELECT COALESCE(SUM(amount),0)::NUMERIC FROM payments WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < date_trunc('month', CURRENT_DATE) ${gymFilter ? 'AND gym_id=' + gymFilter : ''}) AS revenue_last_month,
          (SELECT COUNT(*)::NUMERIC FROM members WHERE status='ACTIVE' AND subscription_end BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE ${gymFilter ? 'AND gym_id=' + gymFilter : ''}) AS expired_last_7d
      )
      SELECT *, 
        CASE WHEN last_month_stats.active_last_month = 0 AND current_stats.active_members = 0 THEN 0 WHEN last_month_stats.active_last_month = 0 THEN 100 ELSE ROUND((((current_stats.active_members - last_month_stats.active_last_month) / last_month_stats.active_last_month) * 100)::NUMERIC, 1) END AS active_trend,
        CASE WHEN last_month_stats.new_members_last_month = 0 AND current_stats.new_members_this_month = 0 THEN 0 WHEN last_month_stats.new_members_last_month = 0 THEN 100 ELSE ROUND((((current_stats.new_members_this_month - last_month_stats.new_members_last_month) / last_month_stats.new_members_last_month) * 100)::NUMERIC, 1) END AS new_members_trend,
        CASE WHEN last_month_stats.revenue_last_month = 0 AND current_stats.revenue_this_month = 0 THEN 0 WHEN last_month_stats.revenue_last_month = 0 THEN 100 ELSE ROUND((((current_stats.revenue_this_month - last_month_stats.revenue_last_month) / last_month_stats.revenue_last_month) * 100)::NUMERIC, 1) END AS revenue_trend,
        CASE WHEN last_month_stats.expired_last_7d = 0 AND current_stats.expiring_soon = 0 THEN 0 WHEN last_month_stats.expired_last_7d = 0 THEN 0 ELSE ROUND((((current_stats.expiring_soon - last_month_stats.expired_last_7d) / last_month_stats.expired_last_7d) * 100)::NUMERIC, 1) END AS expiring_trend
      FROM current_stats, last_month_stats
    `;

    const result = await queryWithRLS(queryStr, [], rls);
    console.log('✅ KPI Results:', result.rows[0]);

    return reply.send({ kpis: result.rows[0] });
  });

  // ─── GET /reports/revenue ─────────────────
  fastify.get('/revenue', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    const { period = '6m', gym_id } = request.query;

    let interval = '6 months';
    let trunc = 'month';

    if (period === '7d') {
      interval = '7 days';
      trunc = 'day';
    } else if (period === '1m') {
      interval = '1 month';
      trunc = 'day';
    } else if (period === '1y') {
      interval = '1 year';
      trunc = 'month';
    } else {
      interval = '6 months';
      trunc = 'month';
    }

    let whereClause = `date_start >= CURRENT_DATE - $1::INTERVAL`;
    const params = [interval];

    if (gym_id) {
      whereClause += ` AND gym_id = $2`;
      params.push(gym_id);
    }

    const result = await queryWithRLS(`
      SELECT DATE_TRUNC('${trunc}', date_start) AS month, COUNT(*) AS total_payments, SUM(amount) AS total_revenue
      FROM payments
      WHERE ${whereClause}
      GROUP BY DATE_TRUNC('${trunc}', date_start) ORDER BY month`,
      params, rls
    );

    return reply.send({ revenue: result.rows });
  });

  // ─── GET /reports/churn (CdC §6.1) ────────
  fastify.get('/churn', { preHandler: [authenticate] }, async (request, reply) => {
    const rls = getRLSContext(request);
    const { gym_id } = request.query;
    const gymFilter = gym_id ? `AND gym_id = ${parseInt(gym_id)}` : '';

    const result = await queryWithRLS(`
      WITH start_count AS (
        SELECT COUNT(*) AS cnt FROM members
        WHERE status IN ('ACTIVE','FROZEN') AND created_at < date_trunc('month', CURRENT_DATE) ${gymFilter}
      ),
      expired_this_month AS (
        SELECT COUNT(*) AS cnt FROM members
        WHERE status='EXPIRED' AND subscription_end>=date_trunc('month',CURRENT_DATE)
        AND subscription_end < date_trunc('month',CURRENT_DATE) + INTERVAL '1 month'
        AND id NOT IN (SELECT member_id FROM payments WHERE date_start>=date_trunc('month',CURRENT_DATE)) ${gymFilter}
      )
      SELECT ROUND(expired_this_month.cnt::NUMERIC / NULLIF(start_count.cnt,0) * 100, 2) AS churn_rate_pct,
             start_count.cnt AS base_members, expired_this_month.cnt AS churned_members
      FROM start_count, expired_this_month`,
      [], rls
    );
    return reply.send({ churn: result.rows[0] });
  });
}
