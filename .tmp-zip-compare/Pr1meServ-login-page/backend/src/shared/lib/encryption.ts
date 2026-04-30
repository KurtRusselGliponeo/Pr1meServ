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

/**
 * Normalizes an email address for stable comparisons and hashing.
 *
 * @param email Raw email address.
 * @returns The trimmed lowercase email address.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Hashes an email address with SHA-256 for deterministic lookups.
 *
 * @param email Raw email address.
 * @returns A hex-encoded SHA-256 hash of the normalized email.
 */
export function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(normalizeEmail(email), 'utf8').digest('hex');
}

/**
 * Encrypts plaintext using AES-256-GCM.
 *
 * @param text Plaintext value to encrypt.
 * @returns Encrypted data plus IV and auth tag.
 */
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

/**
 * Decrypts an AES-256-GCM payload.
 *
 * @param encryptedData Hex-encoded ciphertext.
 * @param ivHex Hex-encoded initialization vector.
 * @param authTagHex Hex-encoded auth tag.
 * @returns The decrypted plaintext.
 */
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

/**
 * Encrypts an email into a transportable payload string.
 *
 * @param email Raw email address.
 * @returns A serialized encrypted email payload.
 */
export function encryptEmail(email: string): string {
  const normalizedEmail = normalizeEmail(email);
  const { encryptedData, iv, authTag } = encrypt(normalizedEmail);

  return [iv, authTag, encryptedData].join(ENCRYPTION_SEGMENT_SEPARATOR);
}

/**
 * Decrypts a serialized encrypted email payload.
 *
 * @param payload Serialized encrypted email payload.
 * @returns The decrypted normalized email address.
 * @throws {Error} When the payload format is invalid.
 */
export function decryptEmail(payload: string): string {
  const [iv, authTag, encryptedData] = payload.split(ENCRYPTION_SEGMENT_SEPARATOR);

  if (!iv || !authTag || !encryptedData) {
    throw new Error('Encrypted email payload is malformed.');
  }

  return decrypt(encryptedData, iv, authTag);
}
