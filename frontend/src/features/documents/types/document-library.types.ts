export interface DocumentLibraryItem {
  id: string;
  uploadedByUserId: string;
  fileUrl: string;
  fileName: string;
  category: string;
  mimeType: string;
  version: string;
  isPinned: boolean;
  createdAtUtc: string;
}
