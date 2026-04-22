import { db } from '@/db/client';
import { agentProfiles, clientProfiles, lapsationRecords, nap, userAccounts } from '@/db/schema';
import { emailQueueService } from '@/features/notifications/email-queue.service';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { decryptEmail } from '@/shared/lib/encryption';
import * as Sentry from '@sentry/node';

const MONITOR_SLUG = 'daily-lapsation-scanner';

function safeSentryCheckIn(params: { monitorSlug: string; status: 'in_progress' | 'ok' | 'error'; checkInId?: string }): string | undefined {
  try {
    // @ts-ignore - Bypassing local type definitions that might be missing exports
    return (Sentry as any).captureCheckIn?.(params);
  } catch (error) {
    console.warn('[Scanner CRON] Sentry check-in failed, continuing gracefully...', error);
    return undefined;
  }
}

function safeSentryException(error: unknown) {
  try {
    // @ts-ignore
    (Sentry as any).captureException?.(error);
  } catch (sentryError) {
    console.warn('[Scanner CRON] Sentry captureException failed...', sentryError);
  }
}

/**
 * Sweeps imported corporate NAP data for lapsation events and mirrors them into tracked records.
 */
export async function runAtRiskDailyScanner() {
  console.log('[Scanner CRON] Starting daily at-risk sweep from NAP corporate ingestion data...');
  
  const checkInId = safeSentryCheckIn({
    monitorSlug: MONITOR_SLUG,
    status: 'in_progress',
  });

  try {
    // Lapsation is now driven strictly by corporate NAP ingestion rows rather than elapsed-time heuristics.
    // We only surface policies whose assigned agent maps back to the same imported agent code.
    const criticalProfiles = await db
      .select({
        policyNumberId: clientProfiles.id,
        encryptedEmail: userAccounts.encryptedEmail,
        lapseDateUtc: nap.transactionDate,
      })
      .from(nap)
      .innerJoin(
        agentProfiles,
        and(
          eq(agentProfiles.agentCode, nap.agentCode),
          isNull(agentProfiles.deletedAtUtc),
        ),
      )
      .innerJoin(
        clientProfiles,
        and(
          eq(clientProfiles.policyNumber, nap.policyNumber),
          eq(clientProfiles.assignedAgentId, agentProfiles.id),
          isNull(clientProfiles.deletedAtUtc),
        ),
      )
      .leftJoin(userAccounts, eq(userAccounts.id, agentProfiles.userId))
      .where(
        sql`UPPER(TRIM(COALESCE(${nap.transactionType}, ''))) IN ('LAPSE', 'SURRENDER', 'CANCEL')`,
      );

    for (const profile of criticalProfiles) {
        const [existingRecord] = await db
          .select({ id: lapsationRecords.id })
          .from(lapsationRecords)
          .where(eq(lapsationRecords.policyNumberId, profile.policyNumberId))
          .limit(1);

        const lapseDateUtc = profile.lapseDateUtc ?? new Date();

        if (existingRecord) {
          await db
            .update(lapsationRecords)
            .set({
              isAtRisk: true,
              reinstatedAtUtc: null,
              lapseDateUtc,
            })
            .where(eq(lapsationRecords.id, existingRecord.id));
        } else {
          await db.insert(lapsationRecords).values({
            policyNumberId: profile.policyNumberId,
            isAtRisk: true,
            lapseDateUtc,
            reinstatedAtUtc: null,
          });
        }
          
        // Alerting follows the imported agent_code -> assigned agent mapping so the correct agent receives the dashboard signal.
        if (profile.encryptedEmail) {
          await emailQueueService.enqueueEmail({
              to: decryptEmail(profile.encryptedEmail),
              subject: 'CRITICAL: Policy lapsation event detected',
              text: 'A policy assigned to you has been marked as at-risk based on the latest corporate NAP lapsation transaction.'
          });
        }
    }
    
    console.log(`[Scanner CRON] Successfully processed ${criticalProfiles.length} critical gaps via auto-flags.`);
    
    if (checkInId) {
      safeSentryCheckIn({
        monitorSlug: MONITOR_SLUG,
        status: 'ok',
        checkInId,
      });
    }
  } catch (error) {
    console.error('[Scanner CRON] Failed during daily at-risk sweep:', error);
    
    safeSentryException(error);
    
    if (checkInId) {
      safeSentryCheckIn({
        monitorSlug: MONITOR_SLUG,
        status: 'error',
        checkInId,
      });
    }
    
    throw error;
  }
}

