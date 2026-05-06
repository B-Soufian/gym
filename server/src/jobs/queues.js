import { Queue } from 'bullmq';

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const memberJobsQueue = new Queue('member-jobs', { connection: REDIS_CONNECTION });
export const queueJobsQueue = new Queue('queue-jobs', { connection: REDIS_CONNECTION });
