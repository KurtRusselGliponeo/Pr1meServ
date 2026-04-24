import { nanoid } from 'nanoid';
import { gdriveService } from '@/lib/gdrive';
import { db } from '@/db/client';
import { agentProfiles, clientProfiles, cosafApprovals, documentLibrary, notifications, systemAuditLogs, userAccounts } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import type { CaseStatus, SystemRole } from '@a1prime/schemas';
import type { AuthTokenPayload } from '@/shared/lib/auth';

type PresignedUploadRequest = {
  fileName: string;
  mimeType: string;
  category: string;
};



function parseVersion(value: string) {
  const parsed = Number.parseInt(value.replace('.0', ''), 10);
  return Number.isFinite(parsed) ? parsed : 1;
}

function getBaseFileName(fileName: string) {
  return fileName.replace(/_v\d+(?=\.[^.]+$)/i, '');
}

/**
 * Handles Google Drive Library Mappings
 */
export class DocumentsService {
  async generatePresignedUrl(input: PresignedUploadRequest) {
    return {
      signedUrl: '',
      documentId: nanoid(),
      fileName: input.fileName,
      mimeType: input.mimeType,
      category: input.category,
    };
  }

  /**
   * Uploads the document directly to Google Drive and tracks it in the database.
   */
  async uploadDocument(fileName: string, mimeType: string, category: string, uploaderId: string, buffer: Buffer) {
    const baseFileName = getBaseFileName(fileName);
    const existing = await db
      .select({
        id: documentLibrary.id,
        fileName: documentLibrary.fileName,
        version: documentLibrary.version,
      })
      .from(documentLibrary)
      .where(eq(documentLibrary.category, category))
      .orderBy(desc(documentLibrary.createdAtUtc));

    const siblingVersions = existing.filter((row) => getBaseFileName(row.fileName) === baseFileName);
    const nextVersion = siblingVersions.length
      ? Math.max(...siblingVersions.map((row) => parseVersion(row.version))) + 1
      : 1;
    
    // Upload directly to Google Drive
    const driveResult = await gdriveService.uploadFile(`${nanoid()}-${fileName}`, mimeType, buffer);
    
    const [insertedDoc] = await db.insert(documentLibrary).values({
      uploadedByUserId: uploaderId,
      fileUrl: driveResult.webViewLink || driveResult.fileId || '',
      fileName,
      category,
      mimeType,
      version: `${nextVersion}.0`,
    }).returning();
    
    return { documentId: insertedDoc.id, webViewLink: driveResult.webViewLink };
  }

  async uploadClientDocument(input: {
    fileName: string;
    mimeType: string;
    category: string;
    bucket: string;
    clientProfileId: string;
    uploaderId: string;
    buffer: Buffer;
  }) {
    const namespacedFileName = `${input.clientProfileId}/${input.bucket}/${input.fileName}`;
    const uploadResult = await this.uploadDocument(
      namespacedFileName,
      input.mimeType,
      input.category,
      input.uploaderId,
      input.buffer,
    );

    await db.insert(systemAuditLogs).values({
      actorUserId: input.uploaderId,
      action: 'client-document.uploaded',
      entityName: 'ClientProfile',
      entityId: input.clientProfileId,
      newValue: {
        documentId: uploadResult.documentId,
        category: input.category,
        bucket: input.bucket,
        fileName: input.fileName,
        folderPath: `${input.clientProfileId}/${input.bucket}`,
        summary: `${input.category} uploaded to ${input.bucket}.`,
      },
    });

    return {
      ...uploadResult,
      folderPath: `${input.clientProfileId}/${input.bucket}`,
    };
  }

  /**
   * Safe fetch queries enforcing Enum Category mapping logic (e.g. filter by 'COSAF')
   */
  async fetchDocuments(category?: string, actorUser?: AuthTokenPayload) {
    const conditions = [];

    if (category) {
      conditions.push(eq(documentLibrary.category, category));
    }

    if (actorUser?.role === 'Agent') {
      conditions.push(eq(documentLibrary.uploadedByUserId, actorUser.sub));
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(documentLibrary)
        .where(and(...conditions))
        .orderBy(desc(documentLibrary.isPinned), desc(documentLibrary.createdAtUtc));
    }

    return db
      .select()
      .from(documentLibrary)
      .orderBy(desc(documentLibrary.isPinned), desc(documentLibrary.createdAtUtc));
  }

  async updatePinnedState(documentId: string, isPinned: boolean) {
    const [updatedDoc] = await db
      .update(documentLibrary)
      .set({ isPinned })
      .where(eq(documentLibrary.id, documentId))
      .returning();

    return updatedDoc ?? null;
  }

  async getDocumentHistory(documentId: string) {
    const [selected] = await db
      .select({
        id: documentLibrary.id,
        category: documentLibrary.category,
        fileName: documentLibrary.fileName,
      })
      .from(documentLibrary)
      .where(eq(documentLibrary.id, documentId))
      .limit(1);

    if (!selected) {
      return [];
    }

    const baseFileName = getBaseFileName(selected.fileName);
    const rows = await db
      .select()
      .from(documentLibrary)
      .where(eq(documentLibrary.category, selected.category))
      .orderBy(desc(documentLibrary.createdAtUtc));

    return rows.filter((row) => getBaseFileName(row.fileName) === baseFileName);
  }

  async markCosafUploadComplete(
    documentId: string,
    clientProfileId: string,
    reviewingBmId: string,
    reason?: string,
  ) {
    const [document] = await db
      .select({
        id: documentLibrary.id,
        category: documentLibrary.category,
      })
      .from(documentLibrary)
      .where(eq(documentLibrary.id, documentId))
      .limit(1);

    if (!document || document.category !== 'COSAF') {
      return null;
    }

    await db
      .update(clientProfiles)
      .set({
        caseStatus: 'Forms Submitted' as CaseStatus,
        updatedAt: new Date(),
      })
      .where(eq(clientProfiles.id, clientProfileId));

    const resolvedReviewerId = await this.resolveReviewingManagerId(clientProfileId, reviewingBmId);

    const [existingApproval] = await db
      .select({ id: cosafApprovals.id })
      .from(cosafApprovals)
      .where(
        and(eq(cosafApprovals.clientProfileId, clientProfileId), eq(cosafApprovals.status, 'PENDING')),
      )
      .limit(1);

    if (!existingApproval) {
      await db.insert(cosafApprovals).values({
        clientProfileId,
        reviewingBmId: resolvedReviewerId,
        status: 'PENDING',
      });
    }

    await db.insert(systemAuditLogs).values({
      actorUserId: reviewingBmId,
      action: 'client-profile.forms-submitted',
      entityName: 'ClientProfile',
      entityId: clientProfileId,
      newValue: {
        caseStatus: 'Forms Submitted',
        documentId,
        reason: reason ?? null,
        summary: 'COSAF upload completed and moved to Forms Submitted.',
      },
    });

    const [client] = await db
      .select({
        firstName: clientProfiles.firstName,
        lastName: clientProfiles.lastName,
        assignedAgentId: clientProfiles.assignedAgentId,
      })
      .from(clientProfiles)
      .where(eq(clientProfiles.id, clientProfileId))
      .limit(1);

    if (client?.assignedAgentId) {
      const [agentUser] = await db
        .select({
          userId: userAccounts.id,
        })
        .from(agentProfiles)
        .innerJoin(userAccounts, eq(userAccounts.id, agentProfiles.userId))
        .where(eq(agentProfiles.id, client.assignedAgentId))
        .limit(1);

      await db.insert(notifications).values({
        userId: agentUser?.userId ?? null,
        channel: 'in-app',
        subject: 'COSAF submitted for review',
        message: `${client.firstName} ${client.lastName}`.trim() + ' moved to Forms Submitted.',
        status: 'sent',
        metadata: JSON.stringify({ clientProfileId, documentId, event: 'forms-submitted' }),
      });
    }

    return { success: true };
  }

  private async resolveReviewingManagerId(clientProfileId: string, actorUserId: string) {
    const [actor] = await db
      .select({
        id: userAccounts.id,
        role: userAccounts.role,
      })
      .from(userAccounts)
      .where(eq(userAccounts.id, actorUserId))
      .limit(1);

    if (actor && ['Admin', 'BranchManager'].includes(actor.role as SystemRole)) {
      return actor.id;
    }

    const [client] = await db
      .select({ branchCode: clientProfiles.branchCode })
      .from(clientProfiles)
      .where(eq(clientProfiles.id, clientProfileId))
      .limit(1);

    if (client?.branchCode) {
      const [branchManager] = await db
        .select({
          id: userAccounts.id,
        })
        .from(userAccounts)
        .innerJoin(agentProfiles, eq(agentProfiles.userId, userAccounts.id))
        .where(
          and(
            eq(userAccounts.role, 'BranchManager'),
            eq(agentProfiles.branchCode, client.branchCode),
          ),
        )
        .limit(1);

      if (branchManager) {
        return branchManager.id;
      }
    }

    const [manager] = await db
      .select({
        id: userAccounts.id,
      })
      .from(userAccounts)
      .where(eq(userAccounts.role, 'BranchManager'))
      .limit(1);

    if (manager) {
      return manager.id;
    }

    const [admin] = await db
      .select({
        id: userAccounts.id,
      })
      .from(userAccounts)
      .where(eq(userAccounts.role, 'Admin'))
      .limit(1);

    return admin?.id ?? actorUserId;
  }
}

export const documentsService = new DocumentsService();

