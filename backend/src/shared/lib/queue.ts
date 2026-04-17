import {
  Queue,
  Worker,
  type ConnectionOptions,
  type JobsOptions,
  type Job,
  type Processor,
  type WorkerOptions,
} from 'bullmq';

import { isRedisEnabled, redis } from '../../lib/redis';
import { logger } from '../../lib/logger';

type QueueJobDefinitions = object;
type QueueJobName<TJobs extends QueueJobDefinitions> = Extract<keyof TJobs, string>;

export interface QueueDefinition {
  name: string;
  defaultJobOptions?: JobsOptions;
}

export interface WorkerDefinition {
  queue: QueueDefinition;
  concurrency?: number;
}

export interface QueueHealthSummary {
  enabled: boolean;
  status: 'ok' | 'disabled' | 'degraded';
  redis: 'ok' | 'disabled' | 'down';
  workerHeartbeat: {
    status: 'fresh' | 'stale' | 'missing' | 'disabled';
    timestampUtc: string | null;
    ageMs: number | null;
  };
}

const WORKER_HEARTBEAT_KEY = 'ops:worker-heartbeat';
const WORKER_HEARTBEAT_STALE_MS = 90_000;

export interface QueueHandle<TJobs extends QueueJobDefinitions> {
  queue: Queue<unknown, unknown, string>;
  add<TName extends QueueJobName<TJobs>>(
    jobName: TName,
    data: TJobs[TName],
    options?: JobsOptions,
  ): Promise<void>;
}

function getQueueConnection(): ConnectionOptions {
  return redis.duplicate();
}

/**
 * Opens and validates a dedicated BullMQ Redis connection.
 *
 * @returns A ready BullMQ connection options object.
 */
export async function createQueueConnection(): Promise<ConnectionOptions> {
  const connection = getQueueConnection();

  if ('connect' in connection && typeof connection.connect === 'function') {
    await connection.connect();
  }

  return connection;
}

/**
 * Creates a typed BullMQ queue handle that future phases can extend with concrete job names.
 *
 * @param definition Queue metadata and default job configuration.
 * @returns Queue helpers with strict job-name and payload typing.
 */
export function createQueue<TJobs extends QueueJobDefinitions>(
  definition: QueueDefinition,
): QueueHandle<TJobs> {
  const queue = new Queue<unknown, unknown, string>(definition.name, {
    connection: getQueueConnection(),
    defaultJobOptions: definition.defaultJobOptions,
  });

  return {
    queue,
    async add<TName extends QueueJobName<TJobs>>(
      jobName: TName,
      data: TJobs[TName],
      options?: JobsOptions,
    ) {
      await queue.add(jobName, data, options);
    },
  };
}

type TypedJob<TJobs extends QueueJobDefinitions, TName extends QueueJobName<TJobs>> = Omit<
  Job<TJobs[QueueJobName<TJobs>], unknown, QueueJobName<TJobs>>,
  'name' | 'data'
> & {
  name: TName;
  data: TJobs[TName];
};

/**
 * Creates a typed BullMQ worker for a queue definition.
 *
 * @param definition Queue metadata used to bind the worker.
 * @param processor Typed BullMQ processor.
 * @param options Optional worker overrides.
 * @returns A BullMQ worker instance.
 */
export function createWorker<TJobs extends QueueJobDefinitions, TResult = void>(
  definition: QueueDefinition,
  processor: (job: TypedJob<TJobs, QueueJobName<TJobs>>) => Promise<TResult>,
  options?: Omit<WorkerOptions, 'connection'>,
): Worker<TJobs[QueueJobName<TJobs>], TResult, QueueJobName<TJobs>> {
  return new Worker<TJobs[QueueJobName<TJobs>], TResult, QueueJobName<TJobs>>(
    definition.name,
    processor as Processor<TJobs[QueueJobName<TJobs>], TResult, QueueJobName<TJobs>>,
    {
      ...options,
      connection: getQueueConnection(),
    },
  );
}

/**
 * Creates a BullMQ worker with standard logging for completed and failed jobs.
 *
 * @param definition Queue metadata and worker concurrency options.
 * @param processor Typed BullMQ processor.
 * @returns A configured BullMQ worker instance.
 */
export function createLoggedWorker<TJobs extends QueueJobDefinitions, TResult = void>(
  definition: WorkerDefinition,
  processor: (job: TypedJob<TJobs, QueueJobName<TJobs>>) => Promise<TResult>,
): Worker<TJobs[QueueJobName<TJobs>], TResult, QueueJobName<TJobs>> {
  const worker = createWorker<TJobs, TResult>(definition.queue, processor, {
    concurrency: definition.concurrency ?? 5,
  });

  worker.on('completed', (job) => {
    logger.info(
      { jobId: job.id, queue: definition.queue.name, jobName: job.name },
      'Job completed.',
    );
  });

  worker.on('failed', (job, error) => {
    logger.error(
      { err: error, jobId: job?.id, queue: definition.queue.name, jobName: job?.name },
      'Job failed.',
    );
  });

  return worker;
}

export async function updateWorkerHeartbeat(now = new Date()): Promise<void> {
  if (!isRedisEnabled) {
    return;
  }

  await redis.connect();
  await redis.set(WORKER_HEARTBEAT_KEY, now.toISOString());
}

export async function getQueueHealthSummary(now = new Date()): Promise<QueueHealthSummary> {
  if (!isRedisEnabled) {
    return {
      enabled: false,
      status: 'disabled',
      redis: 'disabled',
      workerHeartbeat: {
        status: 'disabled',
        timestampUtc: null,
        ageMs: null,
      },
    };
  }

  await redis.connect();
  await redis.ping();
  const rawHeartbeat = await redis.get(WORKER_HEARTBEAT_KEY);

  if (!rawHeartbeat) {
    return {
      enabled: true,
      status: 'degraded',
      redis: 'ok',
      workerHeartbeat: {
        status: 'missing',
        timestampUtc: null,
        ageMs: null,
      },
    };
  }

  const heartbeatDate = new Date(rawHeartbeat);
  const ageMs = now.getTime() - heartbeatDate.getTime();
  const isFresh = Number.isFinite(ageMs) && ageMs <= WORKER_HEARTBEAT_STALE_MS;

  return {
    enabled: true,
    status: isFresh ? 'ok' : 'degraded',
    redis: 'ok',
    workerHeartbeat: {
      status: isFresh ? 'fresh' : 'stale',
      timestampUtc: heartbeatDate.toISOString(),
      ageMs,
    },
  };
}
