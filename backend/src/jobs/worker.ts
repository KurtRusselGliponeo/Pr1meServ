import 'dotenv/config';

import { logger } from '@/lib/logger';
import { assertRedisConnection } from '@/lib/redis';
import { createEmailWorker } from './email.worker';
import { createImportWorker } from './import.worker';

async function startWorkers() {
  await assertRedisConnection();

  createEmailWorker();
  createImportWorker();

  logger.info('Background workers started.');
}

startWorkers().catch((error) => {
  logger.error({ err: error }, 'Failed to start background workers.');
  process.exit(1);
});
