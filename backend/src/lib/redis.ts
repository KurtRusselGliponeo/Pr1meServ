import IORedis from 'ioredis';
import { logger } from './logger';

const redisHost = process.env.REDIS_HOST?.trim() || '127.0.0.1';
const redisPort = Number.parseInt(process.env.REDIS_PORT ?? '6379', 10);

if (!redisHost) {
  throw new Error('REDIS_HOST environment variable is required.');
}

if (Number.isNaN(redisPort)) {
  throw new Error('REDIS_PORT environment variable must be a valid number.');
}

export const redis = new IORedis({
  host: redisHost,
  port: redisPort,
  password: process.env.REDIS_PASSWORD?.trim() || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redis.on('error', (error) => {
  logger.error({ err: error }, 'Redis connection error.');
});

/**
 * Checks whether the Redis connection is responsive.
 *
 * @param No parameters are required.
 * @returns A promise that resolves when Redis is reachable.
 * @throws Rethrows any Redis connectivity error.
 */
export async function assertRedisConnection(): Promise<void> {
  await redis.ping();
}
