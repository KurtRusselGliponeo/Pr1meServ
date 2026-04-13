import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const ENCRYPTION_SEGMENT_SEPARATOR = '.';

function getEncryptionKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY?.trim() || process.env.JWT_SECRET?.trim();

  if (!rawKey) {
    throw new Error('ENCRYPTION_KEY or JWT_SECRET environment variable is required.');
  }

  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  return crypto.createHash('sha256').update(rawKey, 'utf8').digest();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(normalizeEmail(email), 'utf8').digest('hex');
}

export function encrypt(text: string): { encryptedData: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  let encryptedData = cipher.update(text, 'utf8', 'hex');
  encryptedData += cipher.final('hex');

  return {
    encryptedData,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
}

export function decrypt(encryptedData: string, ivHex: string, authTagHex: string): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex'),
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function encryptEmail(email: string): string {
  const normalizedEmail = normalizeEmail(email);
  const { encryptedData, iv, authTag } = encrypt(normalizedEmail);

  return [iv, authTag, encryptedData].join(ENCRYPTION_SEGMENT_SEPARATOR);
}

export function decryptEmail(payload: string): string {
  const [iv, authTag, encryptedData] = payload.split(ENCRYPTION_SEGMENT_SEPARATOR);

  if (!iv || !authTag || !encryptedData) {
    throw new Error('Encrypted email payload is malformed.');
  }

  return decrypt(encryptedData, iv, authTag);
}
