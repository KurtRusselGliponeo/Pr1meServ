import { db, withDbTransaction } from '@/db/client';
import { agentProfiles, clientProfiles, cosafApprovals, systemAuditLogs, userAccounts } from '@/db/schema';
import { emailQueueService } from '@/features/notifications/email-queue.service';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { CaseStatus, CosafApprovalListResponse, UserRole } from '@a1prime/schemas';
import { decryptEmail } from '@/shared/lib/encryption';

/**
 * Orchestrates cross-table mutations mapping Branch Manager Approvals securely
 */
export class CosafApprovalsService {
  async listPendingApprovals(actorId: string, actorRole: UserRole): Promise<CosafApprovalListResponse> {
    const whereClause =
      actorRole === 'Admin'
        ? eq(cosafApprovals.status, 'PENDING')
        : and(eq(cosafApprovals.status, 'PENDING'), eq(cosafApprovals.reviewingBmId, actorId));

    const rows = await db
      .select({
        id: cosafApprovals.id,
        clientProfileId: cosafApprovals.clientProfileId,
        policyNumber: clientProfiles.policyNumber,
        assignedAgentName: agentProfiles.displayName,
        status: cosafApprovals.status,
        createdAtUtc: cosafApprovals.createdAtUtc,
      })
      .from(cosafApprovals)
      .innerJoin(clientProfiles, eq(clientProfiles.id, cosafApprovals.clientProfileId))
      .leftJoin(agentProfiles, eq(agentProfiles.id, clientProfiles.assignedAgentId))
      .where(whereClause)
      .orderBy(desc(cosafApprovals.createdAtUtc));

    return {
      data: rows.map((row) => ({
        id: row.id,
        clientProfileId: row.clientProfileId,
        policyNumber: row.policyNumber,
        assignedAgentName: row.assignedAgentName ?? 'Unassigned',
        status: row.status,
        createdAtUtc: row.createdAtUtc.toISOString(),
      })),
    };
  }

  /**
   * Executes atomic locking approving reassignment states and dispatching emails.
   */
  async approveReassignment(approvalId: string, actorId: string, actorRole: UserRole) {
    const result = await withDbTransaction('approve.cosaf', async (tx) => {
      const [approval] = await tx.select().from(cosafApprovals).where(eq(cosafApprovals.id, approvalId));
      if (!approval) throw new NotFoundError('Approval record not found');
      if (actorRole !== 'Admin' && approval.reviewingBmId !== actorId) {
        throw new ForbiddenError('You can only approve records assigned to your queue.');
      }

      await tx.update(cosafApprovals).set({ status: 'APPROVED' }).where(eq(cosafApprovals.id, approvalId));
      await tx
        .update(clientProfiles)
        .set({ caseStatus: 'BM Signed' as CaseStatus, updatedAt: new Date() })
        .where(eq(clientProfiles.id, approval.clientProfileId));

      await tx.insert(systemAuditLogs).values({
        actorUserId: actorId,
        action: 'cosaf.approved',
        entityName: 'CosafApprovals',
        entityId: approvalId,
        newValue: { status: 'APPROVED', summary: 'COSAF approved.' }
      });

      return {
        success: true,
        clientProfileId: approval.clientProfileId,
      };
    });

    await this.notifyAssignedAgent(result.clientProfileId, {
      subject: 'COSAF Form Approved',
      text: 'Branch manager has approved the reassignment request for one of your clients.',
      approvalId,
      action: 'approve',
    });

    return { success: true };
  }

  /**
   * Strictly enforces rejection Zod structures rejecting states back to Returned via queue emails
   */
  async rejectReassignment(approvalId: string, reason: string, actorId: string, actorRole: UserRole) {
    const result = await withDbTransaction('reject.cosaf', async (tx) => {
      const [approval] = await tx.select().from(cosafApprovals).where(eq(cosafApprovals.id, approvalId));
      if (!approval) throw new NotFoundError('Approval record not found');
      if (actorRole !== 'Admin' && approval.reviewingBmId !== actorId) {
        throw new ForbiddenError('You can only reject records assigned to your queue.');
      }

      const [rejectedApproval] = await tx
        .update(cosafApprovals)
        .set({ status: 'REJECTED', reason })
        .where(eq(cosafApprovals.id, approvalId))
        .returning({
          reason: cosafApprovals.reason,
        });
      await tx
        .update(clientProfiles)
        .set({ caseStatus: 'Returned' as CaseStatus, updatedAt: new Date() })
        .where(eq(clientProfiles.id, approval.clientProfileId));

      await tx.insert(systemAuditLogs).values({
        actorUserId: actorId,
        action: 'cosaf.rejected',
        entityName: 'CosafApprovals',
        entityId: approvalId,
        newValue: { status: 'REJECTED', reason, summary: 'COSAF returned with a reason.' }
      });

      return {
        success: true,
        clientProfileId: approval.clientProfileId,
        reason: rejectedApproval?.reason ?? reason,
      };
    });

    await this.notifyAssignedAgent(result.clientProfileId, {
      subject: 'COSAF Form Returned',
      text: `Branch Manager returned the COSAF request. Reason: ${result.reason}`,
      approvalId,
      action: 'reject',
    });

    return { success: true };
  }

  private async findAssignedAgentEmail(clientProfileId: string): Promise<string | null> {
    const [record] = await db
      .select({
        encryptedEmail: userAccounts.encryptedEmail,
      })
      .from(clientProfiles)
      .innerJoin(agentProfiles, eq(agentProfiles.id, clientProfiles.assignedAgentId))
      .innerJoin(userAccounts, eq(userAccounts.id, agentProfiles.userId))
      .where(
        and(
          eq(clientProfiles.id, clientProfileId),
          isNull(clientProfiles.deletedAtUtc),
          isNull(agentProfiles.deletedAtUtc),
          isNull(userAccounts.deletedAtUtc),
        ),
      )
      .limit(1);

    return record ? decryptEmail(record.encryptedEmail) : null;
  }

  private async notifyAssignedAgent(
    clientProfileId: string,
    payload: {
      subject: string;
      text: string;
      approvalId: string;
      action: 'approve' | 'reject';
    },
  ) {
    try {
      const recipientEmail = await this.findAssignedAgentEmail(clientProfileId);
      if (!recipientEmail) {
        return;
      }

      await emailQueueService.enqueueEmail({
        to: recipientEmail,
        subject: payload.subject,
        text: payload.text,
      });
    } catch (error) {
      logger.warn(
        {
          err: error,
          approvalId: payload.approvalId,
          clientProfileId,
          action: payload.action,
        },
        'COSAF approval state saved, but agent notification failed.',
      );
    }
  }
}

export const cosafApprovalsService = new CosafApprovalsService();

