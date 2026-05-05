import type { MultipartFile } from '@fastify/multipart';
import { db, withDbTransaction } from '@/db/client';
import { agentProfiles, clientProfiles, cosafApprovals, notifications, systemAuditLogs, userAccounts } from '@/db/schema';
import { documentsService } from '@/features/phase-2-bm-workflow/documents/documents.service';
import { emailQueueService } from '@/features/notifications/email-queue.service';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { CaseStatus, CosafApprovalListResponse, UserRole } from '@a1prime/schemas';
import type { AuthTokenPayload } from '@/shared/lib/auth';
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
        clientName: sql<string>`${clientProfiles.firstName} || ' ' || ${clientProfiles.lastName}`,
        assignedAgentName: agentProfiles.displayName,
        caseStatus: clientProfiles.caseStatus,
        status: cosafApprovals.status,
        reason: cosafApprovals.reason,
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
        clientName: row.clientName,
        assignedAgentName: row.assignedAgentName ?? 'Unassigned',
        caseStatus: row.caseStatus,
        status: row.status,
        reason: row.reason ?? null,
        createdAtUtc: row.createdAtUtc.toISOString(),
      })),
    };
  }

  /**
   * Executes atomic locking approving reassignment states and dispatching emails.
   */
  async approveReassignment(approvalId: string, actorId: string, actorRole: UserRole) {
    return withDbTransaction('approve.cosaf', async (tx) => {
       const [approval] = await tx.select().from(cosafApprovals).where(eq(cosafApprovals.id, approvalId));
       if (!approval) throw new NotFoundError('Approval record not found');
       if (actorRole !== 'Admin' && approval.reviewingBmId !== actorId) {
         throw new ForbiddenError('You can only approve records assigned to your queue.');
       }
       const recipientEmail = await this.findAssignedAgentEmail(approval.clientProfileId, tx);
       
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
       
       if (recipientEmail) {
         await emailQueueService.enqueueEmail({
           to: recipientEmail,
           subject: 'COSAF Form Approved',
           text: 'Branch manager has approved the reassignment request for one of your clients.',
         });
       }
       return { success: true };
    });
  }

  /**
   * Strictly enforces rejection Zod structures rejecting states back to Returned via queue emails
   */
  async rejectReassignment(approvalId: string, reason: string, actorId: string, actorRole: UserRole) {
     return withDbTransaction('reject.cosaf', async (tx) => {
       const [approval] = await tx.select().from(cosafApprovals).where(eq(cosafApprovals.id, approvalId));
       if (!approval) throw new NotFoundError('Approval record not found');
       if (actorRole !== 'Admin' && approval.reviewingBmId !== actorId) {
         throw new ForbiddenError('You can only reject records assigned to your queue.');
       }
       const recipientEmail = await this.findAssignedAgentEmail(approval.clientProfileId, tx);
       
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
       
       if (recipientEmail) {
         await emailQueueService.enqueueEmail({
           to: recipientEmail,
           subject: 'COSAF Form Returned',
           text: `Branch Manager returned the COSAF request. Reason: ${rejectedApproval?.reason ?? reason}`,
         });
       }
       
       return { success: true };
    });
  }

  async uploadSignedCopy(
    approvalId: string,
    upload: MultipartFile,
    actorId: string,
    actorRole: UserRole,
  ) {
    const [approval] = await db.select().from(cosafApprovals).where(eq(cosafApprovals.id, approvalId));
    if (!approval) throw new NotFoundError('Approval record not found');
    if (actorRole !== 'Admin' && approval.reviewingBmId !== actorId) {
      throw new ForbiddenError('You can only upload a signed copy for records assigned to your queue.');
    }

    const [client] = await db
      .select({
        id: clientProfiles.id,
        firstName: clientProfiles.firstName,
        lastName: clientProfiles.lastName,
      })
      .from(clientProfiles)
      .where(eq(clientProfiles.id, approval.clientProfileId))
      .limit(1);

    const buffer = await upload.toBuffer();
    const document = await documentsService.uploadClientDocument({
      fileName: upload.filename,
      mimeType: upload.mimetype,
      category: 'COSAF',
      bucket: 'signed-copy',
      clientProfileId: approval.clientProfileId,
      uploaderId: actorId,
      buffer,
      actorUser: {
        id: actorId,
        sub: actorId,
        role: actorRole,
        agentId: null,
        agentCode: null,
        tokenType: 'access',
      } satisfies AuthTokenPayload,
    });

    await db
      .update(cosafApprovals)
      .set({ status: 'APPROVED' })
      .where(eq(cosafApprovals.id, approvalId));

    await db
      .update(clientProfiles)
      .set({ caseStatus: 'BM Signed' as CaseStatus, updatedAt: new Date() })
      .where(eq(clientProfiles.id, approval.clientProfileId));

    await db.insert(systemAuditLogs).values({
      actorUserId: actorId,
      action: 'cosaf.signed-copy-uploaded',
      entityName: 'ClientProfile',
      entityId: approval.clientProfileId,
      newValue: {
        caseStatus: 'BM Signed',
        documentId: document.documentId,
        summary: 'Branch manager uploaded the signed copy.',
      },
    });

    const recipientEmail = await this.findAssignedAgentEmail(approval.clientProfileId);
    if (recipientEmail) {
      await emailQueueService.enqueueEmail({
        to: recipientEmail,
        subject: 'Signed COSAF copy uploaded',
        text: `${client?.firstName ?? 'A client'} ${client?.lastName ?? ''} now has a BM signed copy on file.`,
      });
    }

    await db.insert(notifications).values({
      userId: approval.reviewingBmId,
      channel: 'in-app',
      subject: 'BM signed copy uploaded',
      message: `${client?.firstName ?? 'Client'} ${client?.lastName ?? ''} moved to BM Signed.`,
      status: 'sent',
      metadata: JSON.stringify({
        clientProfileId: approval.clientProfileId,
        approvalId,
        documentId: document.documentId,
        event: 'bm-signed',
      }),
    });

    return { success: true, documentId: document.documentId };
  }

  private async findAssignedAgentEmail(clientProfileId: string, txClient: any = db): Promise<string | null> {
    const [record] = await txClient
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
}

export const cosafApprovalsService = new CosafApprovalsService();

