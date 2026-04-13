import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// In production, this should be derived securely from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

export function encrypt(text: string): { encryptedData: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encryptedData = cipher.update(text, 'utf8', 'hex');
  encryptedData += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encryptedData,
    iv: iv.toString('hex'),
    authTag,
  };
}

export function decrypt(encryptedData: string, ivHex: string, authTagHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
