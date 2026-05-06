import { google } from 'googleapis';
import stream from 'stream';
import { logger } from './logger';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

export class GoogleDriveService {
  private drive;
  private folderId: string;

  constructor() {
    const credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    this.drive = google.drive({ version: 'v3', auth });
    this.folderId = process.env.GDRIVE_FOLDER_ID || '';

    if (!this.folderId) {
      logger.warn('GDRIVE_FOLDER_ID is not set in environment variables.');
    }
  }

  /**
   * Uploads a file stream directly to Google Drive.
   */
  async uploadFile(fileName: string, mimeType: string, buffer: Buffer) {
    try {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(buffer);

      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [this.folderId],
        },
        media: {
          mimeType,
          body: bufferStream,
        },
        fields: 'id, webViewLink, webContentLink',
      });

      return {
        fileId: response.data.id,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to upload file to Google Drive');
      throw new Error('Google Drive upload failed');
    }
  }

  async deleteFile(fileId: string) {
    try {
      await this.drive.files.delete({ fileId });
    } catch (error) {
      logger.error({ err: error, fileId }, 'Failed to delete file from Google Drive');
      throw new Error('Google Drive delete failed');
    }
  }
}

export const gdriveService = new GoogleDriveService();
