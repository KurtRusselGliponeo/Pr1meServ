import type { ImportQueueJobs } from '@/queues/import.queue';
import { importQueueDefinition } from '@/queues/import.queue';
import { createLoggedWorker } from '@/shared/lib/queue';
import { performanceImportService } from '@/features/phase-5-performance/performance/performance-import.service';
import type {
  ApeImportJobPayload,
  NapImportJobPayload,
  PerImportJobPayload,
  RecImportJobPayload,
} from '@a1prime/schemas';

export function createImportWorker() {
  return createLoggedWorker<ImportQueueJobs>(
    {
      queue: importQueueDefinition,
      concurrency: 3,
    },
    async (job) => {
      switch (job.name) {
        case 'process-nap-import':
          await performanceImportService.processNapImport(job.data as NapImportJobPayload);
          return;
        case 'process-per-import':
          await performanceImportService.processPerImport(job.data as PerImportJobPayload);
          return;
        case 'process-ape-import':
          await performanceImportService.processApeImport(job.data as ApeImportJobPayload);
          return;
        case 'process-rec-import':
          await performanceImportService.processRecImport(job.data as RecImportJobPayload);
          return;
      }
    },
  );
}

