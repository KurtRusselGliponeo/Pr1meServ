/**
 * Row Level Security helpers
 *
 * PostgreSQL RLS policies in migration 012 read three session-local GUC variables:
 *   app.current_user_id   — UUID of the authenticated user account
 *   app.current_agent_id  — UUID of the linked AgentProfile (null for BM / Admin)
 *   app.current_role      — 'agent' | 'branch_manager' | 'admin'
 *
 * Because the application connects as a superuser that bypasses RLS by default,
 * you MUST call `withRlsContext` when you want the policies to be enforced.
 *
 * Usage:
 *
 *   import { withRlsContext } from '@/shared/lib/rls';
 *   import { useAuth } from '@/shared/lib/auth';
 *
 *   // In a route handler:
 *   const result = await withRlsContext(request.authUser, async (tx) => {
 *     return tx.select().from(clientProfiles).where(...);
 *   });
 *
 * The helper opens a transaction, sets the three GUC variables with SET LOCAL
 * (so they are automatically cleared when the transaction ends), executes your
 * callback, then commits.
 *
 * NOTE: withRlsContext is opt-in.  All existing service code continues to work
 * unchanged because it still runs as superuser without RLS enforcement.
 * Gradually migrate sensitive routes to use this wrapper.
 */

import { sql } from 'drizzle-orm';
import { db, type DbTransaction } from '@/db/client';
import type { AuthTokenPayload } from '@/shared/lib/auth';

/** Maps JWT roles to the GUC role names used in RLS policies */
const ROLE_MAP: Record<string, string> = {
  Admin: 'admin',
  BranchManager: 'branch_manager',
  Agent: 'agent',
};

export interface RlsContext {
  userId: string;
  agentId: string | null;
  role: string;
}

/**
 * Builds an RLS context object from the authenticated JWT payload.
 */
export function buildRlsContext(authUser: AuthTokenPayload): RlsContext {
  return {
    userId: authUser.sub,
    agentId: authUser.agentId,
    role: ROLE_MAP[authUser.role] ?? 'agent',
  };
}

/**
 * Executes `callback` inside a transaction that has RLS GUC variables set.
 *
 * @param context   RLS context (use buildRlsContext to derive from authUser)
 * @param callback  Database operations to perform under RLS
 */
export async function withRlsContext<TResult>(
  context: RlsContext,
  callback: (tx: DbTransaction) => Promise<TResult>,
): Promise<TResult> {
  return db.transaction(async (tx) => {
    // SET LOCAL scopes these to the current transaction only
    await tx.execute(
      sql`SELECT set_config('app.current_user_id',  ${context.userId},      true)`,
    );
    await tx.execute(
      sql`SELECT set_config('app.current_agent_id', ${context.agentId ?? ''}, true)`,
    );
    await tx.execute(
      sql`SELECT set_config('app.current_role',     ${context.role},         true)`,
    );

    return callback(tx);
  });
}

/**
 * Convenience wrapper: builds the context from authUser, then calls withRlsContext.
 */
export async function withAuthRlsContext<TResult>(
  authUser: AuthTokenPayload,
  callback: (tx: DbTransaction) => Promise<TResult>,
): Promise<TResult> {
  return withRlsContext(buildRlsContext(authUser), callback);
}
