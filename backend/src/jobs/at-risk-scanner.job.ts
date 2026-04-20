import { db } from '@/db/client';
import { agentProfiles, clientProfiles, lapsationRecords, userAccounts } from '@/db/schema';
import { emailQueueService } from '@/features/notifications/email-queue.service';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { decryptEmail } from '@/shared/lib/encryption';

/**
 * Sweeps the DB scanning for isolated DATEDIFF threshold violations (Processing_Days)
 */
export async function runAtRiskDailyScanner() {
  console.log('[Scanner CRON] Starting daily at-risk sweep identifying gap delays...');
  
  // Scans identifying isolated instances greater than roughly 30 days gap limit.
  const criticalProfiles = await db.select({
      id: clientProfiles.id,
      encryptedEmail: userAccounts.encryptedEmail,
  }).from(clientProfiles)
    .leftJoin(agentProfiles, eq(agentProfiles.id, clientProfiles.assignedAgentId))
    .leftJoin(userAccounts, eq(userAccounts.id, agentProfiles.userId))
    .where(sql`EXTRACT(DAY FROM (NOW() - "CreatedAtUtc")) > 30`);

  for (const profile of criticalProfiles) {
      await db.update(lapsationRecords)
        .set({ isAtRisk: true })
        .where(eq(lapsationRecords.policyNumberId, profile.id));
        
      // Queueing automated logic alerts
      if (profile.encryptedEmail) {
        await emailQueueService.enqueueEmail({
            to: decryptEmail(profile.encryptedEmail),
            subject: 'CRITICAL: Policy Lapsation Risk Limit Reached',
            text: 'Processing Days threshold has officially been exceeded on one of your records.'
        });
      }
  }
  
  console.log(`[Scanner CRON] Successfully processed ${criticalProfiles.length} critical gaps via auto-flags.`);
}

