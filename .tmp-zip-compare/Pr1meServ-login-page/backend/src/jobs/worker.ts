import 'dotenv/config';

import { logger } from '@/lib/logger';
import { assertRedisConnection } from '@/lib/redis';
import { updateWorkerHeartbeat } from '@/shared/lib/queue';
import { createEmailWorker } from './email.worker';
import { createImportWorker } from './import.worker';

let heartbeatTimer: NodeJS.Timeout | null = null;

async function startWorkers() {
  await assertRedisConnection();

  createEmailWorker();
  createImportWorker();
  await updateWorkerHeartbeat();
  heartbeatTimer = setInterval(() => {
    void updateWorkerHeartbeat().catch((error) => {
      logger.error({ err: error }, 'Failed to update worker heartbeat.');
    });
  }, 30_000);

  logger.info('Background workers started.');
}

startWorkers().catch((error) => {
  logger.error({ err: error }, 'Failed to start background workers.');
  process.exit(1);
});

process.on('SIGINT', () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
});

process.on('SIGTERM', () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
});
