import type { ImportQueueJobs } from '@/queues/import.queue';
import { importQueueDefinition } from '@/queues/import.queue';
import { createLoggedWorker } from '@/shared/lib/queue';
import { performanceImportService } from '@/services/performance-import.service';

export function createImportWorker() {
  return createLoggedWorker<ImportQueueJobs>(
    {
      queue: importQueueDefinition,
      concurrency: 3,
    },
    async (job) => {
      switch (job.name) {
        case 'process-nap-import':
          await performanceImportService.processNapImport(job.data);
          return;
        case 'process-per-import':
          await performanceImportService.processPerImport(job.data);
          return;
        case 'process-ape-import':
          await performanceImportService.processApeImport(job.data);
          return;
      }
    },
  );
}
