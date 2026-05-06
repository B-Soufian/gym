// ============================================
// tamesna Gym v9.0 — Auth Routes
// POST /auth/login, /auth/refresh, /auth/logout
// CdC Reference: §5.2, §IX
// ============================================

import bcrypt from 'bcrypt';
import { query } from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../config/jwt.js';
import { authenticate } from '../middleware/auth.js';
import redis from '../config/redis.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Register auth routes on Fastify instance
 */
export default async function authRoutes(fastify) {

  // ─── POST /auth/login ──────────────────────────────
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { username, password } = request.body;
    const ip = request.ip;

    // Rate limiting check (5 attempts / 15 min per IP)
    const rateLimitKey = `login_attempts:${ip}`;
    const attempts = await redis.get(rateLimitKey);
    if (attempts && parseInt(attempts) >= 5) {
      // Log failed attempt
      await logAuthEvent(null, username, null, 'LOGIN_FAILED', ip);
      return reply.code(429).send({
        error: 'Trop de tentatives',
        message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
      });
    }

    // Find user
    const result = await query(
      'SELECT id, username, password_hash, role, gym_id, is_active FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      await redis.multi()
        .incr(rateLimitKey)
        .expire(rateLimitKey, 900) // 15 min
        .exec();
      await logAuthEvent(null, username, null, 'LOGIN_FAILED', ip);
      return reply.code(401).send({
        error: 'Identifiants invalides',
        message: 'Nom d\'utilisateur ou mot de passe incorrect',
      });
    }

    const user = result.rows[0];

    // Check if active
    if (!user.is_active) {
      await logAuthEvent(user.id, user.username, user.gym_id, 'LOGIN_FAILED', ip);
      return reply.code(403).send({
        error: 'Compte désactivé',
        message: 'Votre compte a été désactivé. Contactez l\'administrateur.',
      });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await redis.multi()
        .incr(rateLimitKey)
        .expire(rateLimitKey, 900)
        .exec();
      await logAuthEvent(user.id, user.username, user.gym_id, 'LOGIN_FAILED', ip);
      return reply.code(401).send({
        error: 'Identifiants invalides',
        message: 'Nom d\'utilisateur ou mot de passe incorrect',
      });
    }

    // Clear rate limit on success
    await redis.del(rateLimitKey);

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in Redis (for invalidation)
    await redis.set(`refresh:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

    // Log successful login
    await logAuthEvent(user.id, user.username, user.gym_id, 'LOGIN', ip);

    // Set refresh token as httpOnly cookie
    reply.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    return reply.send({
      access_token: accessToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        gym_id: user.gym_id,
      },
    });
  });

  // ─── POST /auth/refresh ──────────────────────────────
  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies?.refresh_token;

    if (!refreshToken) {
      return reply.code(401).send({
        error: 'Token manquant',
        message: 'Aucun refresh token fourni',
        code: 'NO_REFRESH_TOKEN',
      });
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);

      // Check if token is still valid in Redis
      const storedToken = await redis.get(`refresh:${decoded.sub}`);
      if (!storedToken || storedToken !== refreshToken) {
        return reply.code(401).send({
          error: 'Token révoqué',
          message: 'Ce refresh token a été révoqué',
          code: 'TOKEN_REVOKED',
        });
      }

      // Get fresh user data
      const result = await query(
        'SELECT id, username, role, gym_id, is_active FROM users WHERE id = $1',
        [decoded.sub]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        await redis.del(`refresh:${decoded.sub}`);
        return reply.code(401).send({
          error: 'Utilisateur invalide',
          message: 'Compte introuvable ou désactivé',
        });
      }

      const user = result.rows[0];

      // Rotate tokens (new access + new refresh)
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      await redis.set(`refresh:${user.id}`, newRefreshToken, 'EX', 7 * 24 * 60 * 60);
      reply.setCookie('refresh_token', newRefreshToken, REFRESH_COOKIE_OPTIONS);

      return reply.send({
        access_token: newAccessToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          gym_id: user.gym_id,
        },
      });
    } catch (err) {
      return reply.code(401).send({
        error: 'Token invalide',
        message: 'Refresh token invalide ou expiré',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }
  });

  // ─── POST /auth/logout ──────────────────────────────
  fastify.post('/logout', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    // Remove refresh token from Redis
    await redis.del(`refresh:${request.user.id}`);

    // Log logout
    await logAuthEvent(request.user.id, request.user.username, request.user.gym_id, 'LOGOUT', request.ip);

    // Clear cookie
    reply.clearCookie('refresh_token', { path: '/api/v1/auth' });

    return reply.send({ message: 'Déconnexion réussie' });
  });
}

/**
 * Helper: Log authentication events
 */
async function logAuthEvent(userId, username, gymId, actionType, ip) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, username_snapshot, gym_id, action_type, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, username || 'unknown', gymId, actionType, ip]
    );
  } catch (err) {
    console.error('Failed to log auth event:', err.message);
  }
}
