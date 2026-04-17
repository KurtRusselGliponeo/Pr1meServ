import { db } from '@/db/client';
import { lapsationRecords, clientProfiles } from '@/shared/db/schema';
import { emailQueueService } from '@/services/email-queue.service';
import { sql, eq } from 'drizzle-orm';

/**
 * Sweeps the DB scanning for isolated DATEDIFF threshold violations (Processing_Days)
 */
export async function runAtRiskDailyScanner() {
  console.log('[Scanner CRON] Starting daily at-risk sweep identifying gap delays...');
  
  // Scans identifying isolated instances greater than roughly 30 days gap limit.
  const criticalProfiles = await db.select({
      id: clientProfiles.id,
  }).from(clientProfiles)
    .where(sql`EXTRACT(DAY FROM (NOW() - "CreatedAtUtc")) > 30`);

  for (const profile of criticalProfiles) {
      await db.update(lapsationRecords)
        .set({ isAtRisk: true })
        .where(eq(lapsationRecords.policyNumberId, profile.id));
        
      // Queueing automated logic alerts
      await emailQueueService.enqueueEmail({
          to: 'agent@a1prime.local',
          subject: 'CRITICAL: Policy Lapsation Risk Limit Reached',
          text: `Processing Days threshold has officially been exceeded on this record.`
      });
  }
  
  console.log(`[Scanner CRON] Successfully processed ${criticalProfiles.length} critical gaps via auto-flags.`);
}
