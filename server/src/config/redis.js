// ============================================
// tamesna Gym v9.0 — Redis Configuration
// ============================================

import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times) => {
    if (times > 10) {
      console.error('Redis: too many retries, giving up');
      return null;
    }
    return Math.min(times * 200, 5000);
  },
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

export default redis;
