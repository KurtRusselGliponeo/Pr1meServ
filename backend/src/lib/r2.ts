import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type UploadPrivateObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

type UploadPrivateObjectResult = {
  bucket: string;
  key: string;
};

/**
 * Provides a minimal Cloudflare R2 abstraction for private object storage.
 */
export class R2Service {
  private client: S3Client | undefined;
  private bucketName: string | undefined;

  private ensureInitialized() {
    if (this.client) return;

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;
    const bucketName = process.env.AWS_BUCKET_NAME;
    const endpoint = process.env.AWS_ENDPOINT;

    if (!accessKeyId || !secretAccessKey || !region || !bucketName || !endpoint) {
      throw new Error('Cloudflare R2 environment variables are not configured.');
    }

    this.bucketName = bucketName;
    this.client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Uploads an object to a private R2 bucket.
   *
   * @param input Object upload details.
   * @returns Stored bucket and key metadata.
   * @throws {Error} When the upload fails.
   */
  async uploadPrivateObject(input: UploadPrivateObjectInput): Promise<UploadPrivateObjectResult> {
    this.ensureInitialized();
    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucketName!,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    return {
      bucket: this.bucketName!,
      key: input.key,
    };
  }

  /**
   * Generates a signed download URL for a private R2 object.
   *
   * @param key Stored object key.
   * @param expiresInSeconds URL expiry in seconds.
   * @returns Signed URL string.
   * @throws {Error} When the URL cannot be generated.
   */
  async getSignedObjectUrl(key: string, expiresInSeconds: number): Promise<string> {
    this.ensureInitialized();
    return getSignedUrl(
      this.client!,
      new GetObjectCommand({
        Bucket: this.bucketName!,
        Key: key,
      }),
      {
        expiresIn: expiresInSeconds,
      },
    );
  }

  async deletePrivateObject(key: string): Promise<void> {
    this.ensureInitialized();
    await this.client!.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName!,
        Key: key,
      }),
    );
  }
}

export const r2Service = new R2Service();
