# ADR 003: BullMQ Queue

BullMQ is used for background jobs because Redis-backed queues fit email and import workloads well, support retries and worker scaling, and keep request latency off the critical path.
