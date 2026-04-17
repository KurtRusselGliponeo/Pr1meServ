import { db, withDbTransaction } from '@/db/client';
import { clientProfiles, cosafApprovals, systemAuditLogs } from '@/shared/db/schema';
import { emailQueueService } from '@/services/email-queue.service';
import { NotFoundError } from '@/lib/errors';
import { eq } from 'drizzle-orm';
import type { CaseStatus } from '@a1prime/schemas';

/**
 * Orchestrates cross-table mutations mapping Branch Manager Approvals securely
 */
export class CosafApprovalsService {
  /**
   * Executes atomic locking approving reassignment states and dispatching emails.
   */
  async approveReassignment(approvalId: string, actorId: string) {
    return withDbTransaction('approve.cosaf', async (tx) => {
       const [approval] = await tx.select().from(cosafApprovals).where(eq(cosafApprovals.id, approvalId));
       if (!approval) throw new NotFoundError('Approval record not found');
       
       await tx.update(cosafApprovals).set({ status: 'APPROVED' }).where(eq(cosafApprovals.id, approvalId));
       await tx.update(clientProfiles).set({ caseStatus: 'Completed' as CaseStatus }).where(eq(clientProfiles.id, approval.clientProfileId));
       
       await tx.insert(systemAuditLogs).values({
         actorUserId: actorId,
         action: 'cosaf.approved',
         entityName: 'CosafApprovals',
         entityId: approvalId,
         newValue: { status: 'APPROVED' }
       });
       
       await emailQueueService.enqueueEmail({
         to: 'agent@a1prime.local',
         subject: 'COSAF Form Approved',
         text: `Branch manager has approved COSAF reassignment for Client mapping.`
       });
       return { success: true };
    });
  }

  /**
   * Strictly enforces rejection Zod structures rejecting states back to Returned via queue emails
   */
  async rejectReassignment(approvalId: string, reason: string, actorId: string) {
     return withDbTransaction('reject.cosaf', async (tx) => {
       const [approval] = await tx.select().from(cosafApprovals).where(eq(cosafApprovals.id, approvalId));
       if (!approval) throw new NotFoundError('Approval record not found');
       
       await tx.update(cosafApprovals).set({ status: 'REJECTED' }).where(eq(cosafApprovals.id, approvalId));
       await tx.update(clientProfiles).set({ caseStatus: 'Returned' as CaseStatus }).where(eq(clientProfiles.id, approval.clientProfileId));

       await tx.insert(systemAuditLogs).values({
         actorUserId: actorId,
         action: 'cosaf.rejected',
         entityName: 'CosafApprovals',
         entityId: approvalId,
         newValue: { status: 'REJECTED', reason }
       });
       
       await emailQueueService.enqueueEmail({
         to: 'agent@a1prime.local',
         subject: 'COSAF Form Returned',
         text: `Branch Manager securely returned this record. Rejection Reason: ${reason}`
       });
       
       return { success: true };
    });
  }
}

export const cosafApprovalsService = new CosafApprovalsService();
