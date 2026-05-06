// ============================================
// Lakhlifi Gym v9.0 — Auth Middleware
// JWT verification for Fastify
// ============================================

import { verifyAccessToken } from '../config/jwt.js';

/**
 * Fastify plugin: Authenticate JWT from Authorization header
 * Adds req.user = { id, username, role, gym_id }
 */
export async function authenticate(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'Non autorisé',
        message: 'Token d\'authentification requis',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    request.user = {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
      gym_id: decoded.gym_id,
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return reply.code(401).send({
        error: 'Token expiré',
        message: 'Votre session a expiré. Veuillez vous reconnecter.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return reply.code(401).send({
      error: 'Token invalide',
      message: 'Token d\'authentification invalide',
    });
  }
}

/**
 * Build RLS context object from request user.
 * Priority: user's JWT gym_id → request query gym_id → request body gym_id → null
 * This allows global (non-gym-locked) staff to pass a gym_id dynamically.
 */
export function getRLSContext(request) {
  const gymId = request.user.gym_id
    || request.query?.gym_id
    || request.body?.gym_id
    || null;

  return {
    userId: request.user.id,
    username: request.user.username,
    gymId: gymId ? parseInt(gymId) : null,
    role: request.user.role,
  };
}
