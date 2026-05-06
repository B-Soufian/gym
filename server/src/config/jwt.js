// ============================================
// Lakhlifi Gym v9.0 — JWT Configuration
// Access token: 15 min | Refresh token: 7 days
// CdC Reference: §5.2
// ============================================

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate access token (short-lived, stored in memory client-side)
 * Payload: { sub, username, role, gym_id }
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      gym_id: user.gym_id,
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

/**
 * Generate refresh token (long-lived, stored in httpOnly cookie)
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      type: 'refresh',
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
}

/**
 * Verify access token
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
