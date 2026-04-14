import {
  Queue,
  Worker,
  type ConnectionOptions,
  type JobsOptions,
  type Job,
  type Processor,
  type WorkerOptions,
} from 'bullmq';

import { redis } from '../../lib/redis';

type QueueJobDefinitions = Record<string, unknown>;
type QueueJobName<TJobs extends QueueJobDefinitions> = Extract<keyof TJobs, string>;

export interface QueueDefinition {
  name: string;
  defaultJobOptions?: JobsOptions;
}

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
