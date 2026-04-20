import { nanoid } from 'nanoid';
import { gdriveService } from '@/lib/gdrive';
import { db } from '@/db/client';
import { clientProfiles, cosafApprovals, documentLibrary } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import type { CaseStatus } from '@a1prime/schemas';

const PRESIGNED_URL_EXPIRES_IN = 3600; // 1 hr

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

  /**
   * Safe fetch queries enforcing Enum Category mapping logic (e.g. filter by 'COSAF')
   */
  async fetchDocuments(category?: string) {
    if (category) {
      return db
        .select()
        .from(documentLibrary)
        .where(eq(documentLibrary.category, category))
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

  async markCosafUploadComplete(documentId: string, clientProfileId: string, reviewingBmId: string) {
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
        reviewingBmId,
        status: 'PENDING',
      });
    }

    return { success: true };
  }
}

export const documentsService = new DocumentsService();

