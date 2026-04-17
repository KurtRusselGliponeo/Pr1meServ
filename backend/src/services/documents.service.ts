import { nanoid } from 'nanoid';
import { r2Service } from '@/lib/r2';
import { db } from '@/db/client';
import { documentLibrary } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

const PRESIGNED_URL_EXPIRES_IN = 3600; // 1 hr

/**
 * Handles AWS S3/CloudFlare R2 Pre-Signed URL configurations and Library Mappings
 */
export class DocumentsService {
  /**
   * Generates a pre-signed URL allowing frontend clients to upload securely without choking node buffers.
   */
  async generatePresignedUrl(fileName: string, mimeType: string, category: string, uploaderId: string) {
    const objectKey = `documents/${nanoid()}-${fileName}`;
    
    // Core AWS Request Signer binding
    const signedUrl = await r2Service.getSignedObjectUrl(objectKey, PRESIGNED_URL_EXPIRES_IN);
    
    // Register document in DB inherently marking Version 1.0 (Phase 3 Spec)
    const [insertedDoc] = await db.insert(documentLibrary).values({
      uploadedByUserId: uploaderId,
      fileUrl: objectKey,
      category,
      mimeType,
      version: '1.0'
    }).returning();
    
    return { signedUrl, documentId: insertedDoc.id };
  }

  /**
   * Safe fetch queries enforcing Enum Category mapping logic (e.g. filter by 'COSAF')
   */
  async fetchDocuments(category?: string) {
    let query = db.select().from(documentLibrary);
    if (category) {
      query = query.where(eq(documentLibrary.category, category));
    }
    return query;
  }
}

export const documentsService = new DocumentsService();
