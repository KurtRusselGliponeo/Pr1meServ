import path from 'node:path';
import { and, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';

import type {
  ArchiveDocumentRequest,
  DocumentCategory,
  DocumentDownloadResponse,
  DocumentLibraryItem,
  ListDocumentsQuery,
  ListDocumentsResponse,
  UpdateDocumentMetadata,
} from '@a1prime/schemas';
import { db } from '@/db/client';
import {
  agentProfiles,
  clientProfiles,
  cosafApprovals,
  documentLibrary,
  notifications,
  systemAuditLogs,
  userAccounts,
} from '@/db/schema';
import { documentStorageService } from '@/lib/document-storage';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { optimizeUploadFile } from '@/lib/file-optimization';
import type { AuthTokenPayload } from '@/shared/lib/auth';
import { logSystemAudit } from '@/shared/lib/audit';

const DOCUMENT_CATEGORY_ALIASES: Record<string, DocumentCategory> = {
  COSAF: 'COSAF',
  Lapsation: 'Lapsation & Reinstatement',
  'Lapsation & Reinstatement': 'Lapsation & Reinstatement',
  Recruitment: 'Recruitment',
  Compliance: 'Compliance & Policy',
  'Compliance & Policy': 'Compliance & Policy',
  Performance: 'Performance & Reports',
  'Performance & Reports': 'Performance & Reports',
};

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
]);

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function normalizeCategory(category: string): DocumentCategory {
  const normalized = DOCUMENT_CATEGORY_ALIASES[category];

  if (!normalized) {
    throw new BusinessRuleError('Unsupported document category.');
  }

  return normalized;
}

function parseKeywords(rawKeywords: string) {
  return rawKeywords
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function slugifyVersionGroup(fileName: string) {
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);

  return (
    baseName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ||
    'document'
  );
}

type DocumentRecord = typeof documentLibrary.$inferSelect;

export class DocumentsService {
  private async resolveActorBranchCode(actorUser: AuthTokenPayload) {
    if (actorUser.role === 'Admin') {
      return null;
    }

    if (!actorUser.agentId) {
      throw new ForbiddenError('A linked branch profile is required for document access.');
    }

    const [agent] = await db
      .select({
        branchCode: agentProfiles.branchCode,
      })
      .from(agentProfiles)
      .where(eq(agentProfiles.id, actorUser.agentId))
      .limit(1);

    if (!agent) {
      throw new ForbiddenError('A linked branch profile is required for document access.');
    }

    return agent.branchCode;
  }

  private mapDocument(record: DocumentRecord): DocumentLibraryItem {
    return {
      id: record.id,
      uploadedByUserId: record.uploadedByUserId,
      branchCode: record.branchCode ?? null,
      fileUrl: record.fileUrl,
      fileName: record.fileName,
      originalFileName: record.originalFileName,
      category: normalizeCategory(record.category),
      mimeType: record.mimeType,
      fileExtension: record.fileExtension,
      fileSizeBytes: record.fileSizeBytes,
      description: record.description ?? null,
      keywords: parseKeywords(record.keywords),
      version: record.version,
      versionGroup: record.versionGroup,
      isPinned: record.isPinned,
      isArchived: record.isArchived,
      archivedAtUtc: record.archivedAtUtc?.toISOString() ?? null,
      storageProvider: record.storageProvider as DocumentLibraryItem['storageProvider'],
      createdAtUtc: record.createdAtUtc.toISOString(),
    };
  }

  private async findDocumentOrThrow(documentId: string) {
    const [record] = await db
      .select()
      .from(documentLibrary)
      .where(eq(documentLibrary.id, documentId))
      .limit(1);

    if (!record) {
      throw new NotFoundError('Document was not found.');
    }

    return record;
  }

  private async assertCanManageDocument(record: DocumentRecord, actorUser: AuthTokenPayload) {
    if (actorUser.role === 'Admin') {
      return;
    }

    if (actorUser.role !== 'BranchManager') {
      throw new ForbiddenError('Only Admin and BranchManager can manage documents.');
    }

    const actorBranch = await this.resolveActorBranchCode(actorUser);
    if (record.branchCode && actorBranch !== record.branchCode) {
      throw new ForbiddenError('Branch managers can only manage documents for their own branch.');
    }
  }

  async uploadDocument(input: {
    fileName: string;
    mimeType: string;
    category: string;
    uploaderId: string;
    buffer: Buffer;
    actorUser: AuthTokenPayload;
    branchCode?: string;
    description?: string;
    keywords?: string[];
  }) {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(input.mimeType)) {
      throw new BusinessRuleError('Only PDF, Office, and image uploads are allowed.');
    }

    if (input.buffer.byteLength > MAX_UPLOAD_BYTES) {
      throw new BusinessRuleError('Files must be 25MB or smaller.');
    }

    const category = normalizeCategory(input.category);
    const actorBranchCode = await this.resolveActorBranchCode(input.actorUser);
    const targetBranchCode =
      input.actorUser.role === 'Admin' ? input.branchCode?.trim() || null : actorBranchCode;

    const optimized = await optimizeUploadFile({
      fileName: input.fileName,
      mimeType: input.mimeType,
      buffer: input.buffer,
    });

    const originalFileName = input.fileName;
    const versionGroup = slugifyVersionGroup(originalFileName);
    const siblingVersions = await db
      .select({
        id: documentLibrary.id,
        version: documentLibrary.version,
      })
      .from(documentLibrary)
      .where(
        and(
          eq(documentLibrary.versionGroup, versionGroup),
          eq(documentLibrary.category, category),
          targetBranchCode === null
            ? isNull(documentLibrary.branchCode)
            : eq(documentLibrary.branchCode, targetBranchCode),
        ),
      )
      .orderBy(desc(documentLibrary.createdAtUtc));

    const nextVersion =
      siblingVersions.length > 0
        ? `${Math.max(...siblingVersions.map((row) => Number.parseInt(row.version, 10) || 1)) + 1}.0`
        : '1.0';

    const storedFileName = `${versionGroup}-v${nextVersion}.${optimized.extension}`;
    const storageResult = await documentStorageService.upload({
      fileName: storedFileName,
      mimeType: optimized.mimeType,
      buffer: optimized.buffer,
      branchCode: targetBranchCode,
      category,
      versionGroup,
    });

    const archivedAtUtc = new Date();

    if (siblingVersions.length > 0) {
      await db
        .update(documentLibrary)
        .set({
          isArchived: true,
          archivedAtUtc,
          archivedByUserId: input.uploaderId,
          isPinned: false,
        })
        .where(inArray(documentLibrary.id, siblingVersions.map((row) => row.id)));
    }

    const [inserted] = await db
      .insert(documentLibrary)
      .values({
        uploadedByUserId: input.uploaderId,
        fileUrl: storageResult.fileUrl,
        fileName: storedFileName,
        originalFileName,
        branchCode: targetBranchCode,
        category,
        mimeType: optimized.mimeType,
        fileExtension: optimized.extension,
        fileSizeBytes: optimized.buffer.byteLength,
        description: input.description?.trim() || null,
        keywords: (input.keywords ?? []).join(','),
        version: nextVersion,
        versionGroup,
        isPinned: false,
        isArchived: false,
        storageProvider: storageResult.provider,
        storageKey: storageResult.storageKey,
      })
      .returning();

    await logSystemAudit({
      action: 'document.uploaded',
      userId: input.uploaderId,
      entityName: 'DocumentLibrary',
      resourceId: inserted.id,
      newValue: {
        category,
        branchCode: targetBranchCode,
        version: inserted.version,
        versionGroup,
        storageProvider: storageResult.provider,
        optimization: optimized.optimization,
        summary: `${category} uploaded to the centralized document library.`,
      },
    });

    return {
      documentId: inserted.id,
      webViewLink: storageResult.webViewLink,
      storageProvider: storageResult.provider,
      version: inserted.version,
    };
  }

  async uploadClientDocument(input: {
    fileName: string;
    mimeType: string;
    category: string;
    bucket: string;
    clientProfileId: string;
    uploaderId: string;
    buffer: Buffer;
    actorUser: AuthTokenPayload;
  }) {
    const [client] = await db
      .select({
        id: clientProfiles.id,
        branchCode: clientProfiles.branchCode,
      })
      .from(clientProfiles)
      .where(eq(clientProfiles.id, input.clientProfileId))
      .limit(1);

    if (!client) {
      throw new NotFoundError('Client profile was not found.');
    }

    const uploadResult = await this.uploadDocument({
      fileName: `${input.clientProfileId}-${input.bucket}-${input.fileName}`,
      mimeType: input.mimeType,
      category: input.category,
      uploaderId: input.uploaderId,
      buffer: input.buffer,
      actorUser: input.actorUser,
      branchCode: client.branchCode,
      keywords: [input.clientProfileId, input.bucket],
      description: `Client-scoped upload stored in ${input.bucket}.`,
    });

    await logSystemAudit({
      action: 'client-document.uploaded',
      userId: input.uploaderId,
      entityName: 'ClientProfile',
      resourceId: input.clientProfileId,
      newValue: {
        documentId: uploadResult.documentId,
        bucket: input.bucket,
        summary: `Client document uploaded to ${input.bucket}.`,
      },
    });

    return {
      ...uploadResult,
      folderPath: `${input.clientProfileId}/${input.bucket}`,
    };
  }

  async fetchDocuments(query: ListDocumentsQuery, actorUser: AuthTokenPayload): Promise<ListDocumentsResponse> {
    const actorBranchCode = await this.resolveActorBranchCode(actorUser);
    const conditions = [];

    if (actorUser.role !== 'Admin') {
      conditions.push(
        or(isNull(documentLibrary.branchCode), eq(documentLibrary.branchCode, actorBranchCode!))!,
      );
    }

    if (!query.includeArchived) {
      conditions.push(eq(documentLibrary.isArchived, false));
    }

    if (query.category) {
      conditions.push(eq(documentLibrary.category, query.category));
    }

    if (query.fileType) {
      conditions.push(eq(documentLibrary.fileExtension, query.fileType.toLowerCase()));
    }

    if (query.search) {
      const searchPattern = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(documentLibrary.fileName, searchPattern),
          ilike(documentLibrary.originalFileName, searchPattern),
          ilike(documentLibrary.category, searchPattern),
          ilike(documentLibrary.keywords, searchPattern),
          ilike(documentLibrary.description, searchPattern),
        )!,
      );
    }

    const rows = await db
      .select()
      .from(documentLibrary)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(documentLibrary.isPinned), desc(documentLibrary.createdAtUtc));

    return {
      data: rows.map((row) => this.mapDocument(row)),
    };
  }

  async updatePinnedState(documentId: string, isPinned: boolean, actorUser: AuthTokenPayload) {
    const existing = await this.findDocumentOrThrow(documentId);
    await this.assertCanManageDocument(existing, actorUser);

    const [updatedDoc] = await db
      .update(documentLibrary)
      .set({ isPinned })
      .where(eq(documentLibrary.id, documentId))
      .returning();

    await logSystemAudit({
      action: isPinned ? 'document.pinned' : 'document.unpinned',
      userId: actorUser.sub,
      entityName: 'DocumentLibrary',
      resourceId: documentId,
      newValue: {
        isPinned,
      },
    });

    return updatedDoc ? this.mapDocument(updatedDoc) : null;
  }

  async updateMetadata(documentId: string, input: UpdateDocumentMetadata, actorUser: AuthTokenPayload) {
    const existing = await this.findDocumentOrThrow(documentId);
    await this.assertCanManageDocument(existing, actorUser);

    const [updated] = await db
      .update(documentLibrary)
      .set({
        category: input.category ?? existing.category,
        description:
          input.description === undefined ? existing.description : input.description?.trim() || null,
        keywords: input.keywords ? input.keywords.join(',') : existing.keywords,
        originalFileName: input.fileName?.trim() || existing.originalFileName,
      })
      .where(eq(documentLibrary.id, documentId))
      .returning();

    await logSystemAudit({
      action: 'document.metadata-updated',
      userId: actorUser.sub,
      entityName: 'DocumentLibrary',
      resourceId: documentId,
      oldValue: {
        category: existing.category,
        description: existing.description,
        keywords: existing.keywords,
        originalFileName: existing.originalFileName,
      },
      newValue: {
        category: updated.category,
        description: updated.description,
        keywords: updated.keywords,
        originalFileName: updated.originalFileName,
      },
    });

    return this.mapDocument(updated);
  }

  async archiveDocument(documentId: string, input: ArchiveDocumentRequest, actorUser: AuthTokenPayload) {
    const existing = await this.findDocumentOrThrow(documentId);
    await this.assertCanManageDocument(existing, actorUser);

    const archivedAtUtc = new Date();
    const [updated] = await db
      .update(documentLibrary)
      .set({
        isArchived: true,
        isPinned: false,
        archivedAtUtc,
        archivedByUserId: actorUser.sub,
      })
      .where(eq(documentLibrary.id, documentId))
      .returning();

    await logSystemAudit({
      action: 'document.archived',
      userId: actorUser.sub,
      entityName: 'DocumentLibrary',
      resourceId: documentId,
      newValue: {
        reason: input.reason,
        archivedAtUtc: archivedAtUtc.toISOString(),
      },
    });

    return this.mapDocument(updated);
  }

  async getDocumentHistory(documentId: string, actorUser: AuthTokenPayload) {
    const selected = await this.findDocumentOrThrow(documentId);
    const actorBranchCode = await this.resolveActorBranchCode(actorUser);
    const rows = await db
      .select()
      .from(documentLibrary)
      .where(
        and(
          eq(documentLibrary.versionGroup, selected.versionGroup),
          eq(documentLibrary.category, selected.category),
          actorUser.role === 'Admin'
            ? undefined
            : or(isNull(documentLibrary.branchCode), eq(documentLibrary.branchCode, actorBranchCode!)),
        ),
      )
      .orderBy(desc(documentLibrary.createdAtUtc));

    return rows.map((row) => this.mapDocument(row));
  }

  async getDownloadUrl(documentId: string, actorUser: AuthTokenPayload): Promise<DocumentDownloadResponse> {
    const document = await this.findDocumentOrThrow(documentId);
    const actorBranchCode = await this.resolveActorBranchCode(actorUser);

    if (actorUser.role !== 'Admin' && document.branchCode && document.branchCode !== actorBranchCode) {
      throw new ForbiddenError('You do not have access to download this document.');
    }

    return documentStorageService.getDownloadUrl(
      document.storageProvider as DocumentLibraryItem['storageProvider'],
      document.storageKey ?? document.fileUrl,
      document.fileUrl,
    );
  }

  async markCosafUploadComplete(
    documentId: string,
    clientProfileId: string,
    reviewingBmId: string,
    reason?: string,
  ) {
    const document = await this.findDocumentOrThrow(documentId);

    if (normalizeCategory(document.category) !== 'COSAF') {
      return null;
    }

    await db
      .update(clientProfiles)
      .set({
        caseStatus: 'Forms Submitted',
        updatedAt: new Date(),
      })
      .where(eq(clientProfiles.id, clientProfileId));

    const resolvedReviewerId = await this.resolveReviewingManagerId(clientProfileId, reviewingBmId);

    const [existingApproval] = await db
      .select({ id: cosafApprovals.id })
      .from(cosafApprovals)
      .where(and(eq(cosafApprovals.clientProfileId, clientProfileId), eq(cosafApprovals.status, 'PENDING')))
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

    if (actor && ['Admin', 'BranchManager'].includes(actor.role)) {
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
        .where(and(eq(userAccounts.role, 'BranchManager'), eq(agentProfiles.branchCode, client.branchCode)))
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
