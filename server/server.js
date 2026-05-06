// ============================================
// tamesna Gym v9.0 — Server Entry Point
// Fastify + all plugins and routes
// ============================================

import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';

import authRoutes from './src/routes/auth.js';
import gymRoutes from './src/routes/gyms.js';
import memberRoutes from './src/routes/members.js';
import paymentRoutes from './src/routes/payments.js';
import subscriptionRoutes from './src/routes/subscriptions.js';
import reportRoutes from './src/routes/reports.js';
import queueRoutes from './src/routes/queue.js';
import auditRoutes from './src/routes/audit.js';
import { healthCheck } from './src/config/database.js';
import { scheduleJobs, startWorkers } from './src/jobs/index.js';
import { initWhatsApp } from './src/services/whatsapp.js';

dotenv.config({ path: '../.env' });

const PORT = parseInt(process.env.PORT || '3000');
const HOST = '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
  trustProxy: true,
});

async function buildServer() {
  // ─── Plugins ────────────────────────────────
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  await fastify.register(cookie, {
    secret: process.env.JWT_REFRESH_SECRET || 'cookie-secret',
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // ─── Health Check ───────────────────────────
  fastify.get('/api/health', async () => {
    const dbTime = await healthCheck();
    return { status: 'ok', database: dbTime, version: '9.0.0' };
  });

  // ─── API Routes ─────────────────────────────
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(gymRoutes, { prefix: '/api/v1/gyms' });
  await fastify.register(memberRoutes, { prefix: '/api/v1/members' });
  await fastify.register(paymentRoutes, { prefix: '/api/v1/payments' });
  await fastify.register(subscriptionRoutes, { prefix: '/api/v1/subscriptions' });
  await fastify.register(reportRoutes, { prefix: '/api/v1/reports' });
  await fastify.register(queueRoutes, { prefix: '/api/v1/queue' });
  await fastify.register(auditRoutes, { prefix: '/api/v1/audit' });

  // ─── Global Error Handler ──────────────────
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    const response = {
      error: statusCode >= 500 ? 'Erreur serveur' : error.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
    };
    reply.code(statusCode).send(response);
  });

  return fastify;
}

async function start() {
  try {
    await buildServer();

    // Start BullMQ workers and schedule jobs
    try {
      startWorkers();
      await scheduleJobs();
    } catch (err) {
      console.warn('⚠️ BullMQ: could not start (Redis may be unavailable):', err.message);
    }

    // Initialize WhatsApp engine independently of Redis
    try {
      initWhatsApp();
    } catch (err) {
      console.warn('⚠️ WhatsApp initialization failed:', err.message);
    }

    await fastify.listen({ port: PORT, host: HOST });
    console.log(`
╔══════════════════════════════════════════╗
║       🏋️  tamesna Gym v9.0  🏋️       ║
║──────────────────────────────────────────║
║  Server:  http://localhost:${PORT}          ║
║  API:     http://localhost:${PORT}/api/v1   ║
║  Health:  http://localhost:${PORT}/api/health║
║  Mode:    ${process.env.NODE_ENV || 'development'}                    ║
╚══════════════════════════════════════════╝
    `);
  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
}

start();
