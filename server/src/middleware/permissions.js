// ============================================
// tamesna Gym v9.0 — Permissions Middleware
// Role-based access control (CdC §5.1)
// ============================================

/**
 * Require specific role(s) to access a route.
 *
 * @param  {...string} roles - Allowed roles ('SUPER_ADMIN', 'STAFF')
 * @returns {Function} Fastify preHandler hook
 *
 * Usage:
 *   { preHandler: [authenticate, requireRole('SUPER_ADMIN')] }
 */
export function requireRole(...roles) {
  return async function (request, reply) {
    if (!request.user) {
      return reply.code(401).send({
        error: 'Non autorisé',
        message: 'Authentification requise',
      });
    }

    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({
        error: 'Accès refusé',
        message: `Cette action nécessite le rôle: ${roles.join(' ou ')}`,
      });
    }
  };
}

/**
 * Require SUPER_ADMIN role
 */
export function requireSuperAdmin() {
  return requireRole('SUPER_ADMIN');
}

/**
 * Permission matrix from CdC §5.1
 * Returns middleware that checks specific action permissions
 */
const PERMISSION_MATRIX = {
  // Gym management
  'gym:create': ['SUPER_ADMIN'],
  'gym:delete': ['SUPER_ADMIN'],
  'gym:read_all': ['SUPER_ADMIN'],

  // Staff management
  'staff:create': ['SUPER_ADMIN'],
  'staff:deactivate': ['SUPER_ADMIN'],

  // Members
  'member:create': ['SUPER_ADMIN', 'STAFF'],
  'member:read': ['SUPER_ADMIN', 'STAFF'],
  'member:update': ['SUPER_ADMIN', 'STAFF'],
  'member:delete': ['SUPER_ADMIN', 'STAFF'],

  // Payments
  'payment:create': ['SUPER_ADMIN', 'STAFF'],
  'payment:read': ['SUPER_ADMIN', 'STAFF'],
  'payment:read_all': ['SUPER_ADMIN'],

  // Subscriptions
  'subscription:create': ['SUPER_ADMIN'],
  'subscription:update': ['SUPER_ADMIN'],
  'subscription:read': ['SUPER_ADMIN', 'STAFF'],

  // Audit
  'audit:read_all': ['SUPER_ADMIN'],
  'audit:read_own': ['SUPER_ADMIN', 'STAFF'],

  // Dashboard
  'dashboard:multi': ['SUPER_ADMIN'],

  // Reports
  'report:export_all': ['SUPER_ADMIN'],
  'report:export_own': ['SUPER_ADMIN', 'STAFF'],

  // WhatsApp
  'queue:manage': ['SUPER_ADMIN', 'STAFF'],
};

/**
 * Check a specific permission.
 *
 * @param {string} permission - Permission key (e.g., 'gym:create')
 * @returns {Function} Fastify preHandler hook
 */
export function requirePermission(permission) {
  return async function (request, reply) {
    if (!request.user) {
      return reply.code(401).send({
        error: 'Non autorisé',
        message: 'Authentification requise',
      });
    }

    const allowedRoles = PERMISSION_MATRIX[permission];
    if (!allowedRoles) {
      return reply.code(500).send({
        error: 'Erreur serveur',
        message: `Permission inconnue: ${permission}`,
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.code(403).send({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas les droits nécessaires pour cette action',
      });
    }
  };
}
