import IORedis from 'ioredis';
import { logger } from './logger';

const redisHost = process.env.REDIS_HOST?.trim() || '127.0.0.1';
const redisPort = Number.parseInt(process.env.REDIS_PORT ?? '6379', 10);
const redisEnabled =
  process.env.REDIS_ENABLED?.trim() === 'true' || process.env.NODE_ENV === 'production';

if (Number.isNaN(redisPort)) {
  throw new Error('REDIS_PORT environment variable must be a valid number.');
}

export const isRedisEnabled = redisEnabled;

export const redis = new IORedis({
  host: redisHost,
  port: redisPort,
  password: process.env.REDIS_PASSWORD?.trim() || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
});

let hasLoggedRedisError = false;

redis.on('error', (error) => {
  if (!isRedisEnabled) {
    return;
  }

  logger.error({ err: error }, 'Redis connection error.');
});

/**
 * Checks whether the Redis connection is responsive when Redis is enabled.
 *
 * @returns A promise that resolves when Redis is reachable or skipped.
 * @throws Rethrows Redis connectivity errors when Redis is required.
 */
export async function assertRedisConnection(): Promise<void> {
  if (!isRedisEnabled) {
    if (!hasLoggedRedisError) {
      logger.warn(
        'Redis is disabled for this environment. Falling back to in-memory rate limiting.',
      );
      hasLoggedRedisError = true;
    }

    return;
  }

  await redis.connect();
  await redis.ping();
}
