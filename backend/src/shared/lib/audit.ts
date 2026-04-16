import { db } from '../db/client';
import type { DbTransaction, DatabaseClient } from '../db/client';
import { systemAuditLogs } from '../db/schema';

export interface AuditLogPayload {
  action: string;
  userId?: string;
  entityName?: string;
  resourceId?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

type AuditDatabase = DatabaseClient | DbTransaction;

/**
 * Persists a structured audit log row into the SystemAuditLogs table.
 *
 * @param payload Audit event details to be recorded.
 * @param database Database client or transaction to write through.
 * @returns A promise that resolves once the row has been inserted.
 */
export async function logSystemAudit(
  payload: AuditLogPayload,
  database: AuditDatabase = db,
): Promise<void> {
  await database.insert(systemAuditLogs).values({
    actorUserId: payload.userId ?? null,
    action: payload.action,
    entityName: payload.entityName ?? 'UnknownEntity',
    entityId: payload.resourceId ?? null,
    oldValue: payload.oldValue ?? null,
    newValue: payload.newValue ?? null,
  });
}
