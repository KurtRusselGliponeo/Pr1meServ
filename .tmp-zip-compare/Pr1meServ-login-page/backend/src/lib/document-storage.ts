import fs from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';

import { gdriveService } from '@/lib/gdrive';
import { r2Service } from '@/lib/r2';

export type StorageProvider = 'R2' | 'GoogleDrive';

export type UploadStoredDocumentInput = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  branchCode: string | null;
  category: string;
  versionGroup: string;
};

export type UploadStoredDocumentResult = {
  provider: StorageProvider;
  fileUrl: string;
  storageKey: string;
  webViewLink: string | null;
};

function getSignedUrlExpirySeconds() {
  return Number.parseInt(process.env.DOCUMENT_STORAGE_SIGNED_URL_TTL_SECONDS ?? '900', 10);
}

function getConfiguredProvider(): StorageProvider {
  const explicitProvider = process.env.DOCUMENT_STORAGE_PROVIDER;

  if (explicitProvider === 'R2' || explicitProvider === 'GoogleDrive') {
    return explicitProvider;
  }

  if (
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_BUCKET_NAME &&
    process.env.AWS_ENDPOINT
  ) {
    return 'R2';
  }

  return 'GoogleDrive';
}

function hasGoogleDriveConfig() {
  return Boolean(
    process.env.GOOGLE_CLIENT_EMAIL?.trim() &&
      process.env.GOOGLE_PRIVATE_KEY?.trim() &&
      process.env.GDRIVE_FOLDER_ID?.trim(),
  );
}

async function writeLocalFallback(storagePath: string, buffer: Buffer) {
  const root = path.resolve(process.cwd(), '.local-storage');
  const absolutePath = path.join(root, ...storagePath.split('/'));
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return absolutePath;
}

function buildStoragePath(input: UploadStoredDocumentInput) {
  const scope = input.branchCode ?? 'GLOBAL';
  return `${scope}/${input.category}/${input.versionGroup}/${nanoid()}-${input.fileName}`;
}

export class DocumentStorageService {
  async upload(input: UploadStoredDocumentInput): Promise<UploadStoredDocumentResult> {
    const provider = getConfiguredProvider();
    const storagePath = buildStoragePath(input);

    if (provider === 'R2') {
      await r2Service.uploadPrivateObject({
        key: storagePath,
        body: input.buffer,
        contentType: input.mimeType,
      });

      return {
        provider,
        fileUrl: storagePath,
        storageKey: storagePath,
        webViewLink: null,
      };
    }

    if (!hasGoogleDriveConfig()) {
      const absolutePath = await writeLocalFallback(storagePath, input.buffer);

      return {
        provider: 'GoogleDrive',
        fileUrl: absolutePath,
        storageKey: absolutePath,
        webViewLink: null,
      };
    }

    const result = await gdriveService.uploadFile(storagePath, input.mimeType, input.buffer);

    return {
      provider: 'GoogleDrive',
      fileUrl: result.webViewLink || result.webContentLink || result.fileId || storagePath,
      storageKey: result.fileId || storagePath,
      webViewLink: result.webViewLink || null,
    };
  }

  async getDownloadUrl(provider: StorageProvider, storageKey: string, fallbackUrl: string) {
    if (provider === 'R2') {
      const expiresInSeconds = getSignedUrlExpirySeconds();
      return {
        downloadUrl: await r2Service.getSignedObjectUrl(storageKey, expiresInSeconds),
        expiresAtUtc: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      };
    }

    return {
      downloadUrl: fallbackUrl,
      expiresAtUtc: null,
    };
  }
}

export const documentStorageService = new DocumentStorageService();
