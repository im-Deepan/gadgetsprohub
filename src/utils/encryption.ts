import * as crypto from 'crypto';

/**
 * Enterprise Cryptographic Utility
 * Implements authenticated encryption using AES-256-GCM (Galois/Counter Mode)
 * providing confidentiality, integrity, and authenticity for sensitive persisted data.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag
const SALT = 'gadgetsprohub-master-data-protection-salt-v1';

// Cache derived keys to prevent synchronous PBKDF2 blocking the event loop on every request
const keyCache = new Map<string, Buffer>();

/**
 * Derives a 256-bit cryptographic key from a secret using PBKDF2
 */
function deriveKey(secret?: string): Buffer {
  const masterSecret = 
    secret || 
    process.env.ENCRYPTION_MASTER_KEY || 
    process.env.AI_KEY_ENCRYPTION_SECRET || 
    process.env.JWT_SECRET || 
    'gadgetsprohub-default-fallback-secret-key-32b';

  // Return cached key if already derived
  if (keyCache.has(masterSecret)) {
    return keyCache.get(masterSecret)!;
  }

  const key = crypto.pbkdf2Sync(masterSecret, SALT, 100000, 32, 'sha256');
  keyCache.set(masterSecret, key);
  return key;
}

export interface EncryptedPayload {
  iv: string;
  tag: string;
  ciphertext: string;
  version: number;
}

/**
 * Encrypts sensitive plaintext using AES-256-GCM with unique initialization vector
 * and generates a verifiable authentication tag.
 * Returns a serialized token in the format: v1:iv:tag:ciphertext (base64)
 */
export function encryptSensitiveData(plainText: string, customSecret?: string): string {
  if (typeof plainText !== 'string' || plainText.length === 0) {
    throw new Error('Encryption error: Input data must be a non-empty string');
  }

  const key = deriveKey(customSecret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let ciphertext = cipher.update(plainText, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext}`;
}

/**
 * Decrypts and verifies an AES-256-GCM encrypted payload.
 * Validates integrity via the authentication tag, strictly rejecting tampered ciphertext.
 */
export function decryptSensitiveData(encryptedString: string, customSecret?: string): string {
  if (!encryptedString || typeof encryptedString !== 'string') {
    throw new Error('Decryption error: Invalid encrypted payload');
  }

  const parts = encryptedString.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    // Check legacy format fallback if necessary (iv:ciphertext)
    if (parts.length === 2) {
      return decryptLegacyCbc(encryptedString, customSecret);
    }
    throw new Error('Decryption error: Unrecognized encryption format or version mismatch');
  }

  const [, ivBase64, tagBase64, ciphertext] = parts;
  const key = deriveKey(customSecret);
  const iv = Buffer.from(ivBase64, 'base64');
  const tag = Buffer.from(tagBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Encrypts a serializable object to an encrypted string token
 */
export function encryptObject(obj: Record<string, any>, customSecret?: string): string {
  const json = JSON.stringify(obj);
  return encryptSensitiveData(json, customSecret);
}

/**
 * Decrypts an encrypted token back into an object
 */
export function decryptObject<T = Record<string, any>>(encryptedString: string, customSecret?: string): T | null {
  try {
    const json = decryptSensitiveData(encryptedString, customSecret);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Backward compatibility helper for legacy CBC encrypted strings
 */
function decryptLegacyCbc(encryptedText: string, customSecret?: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return '';
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const secret = customSecret || process.env.AI_KEY_ENCRYPTION_SECRET || 'salt-enterprise-affiliate-ai';
    
    const cacheKey = `legacy:${secret}`;
    let key: Buffer;
    if (keyCache.has(cacheKey)) {
      key = keyCache.get(cacheKey)!;
    } else {
      key = crypto.scryptSync(secret, 'salt-enterprise-affiliate-ai', 32);
      keyCache.set(cacheKey, key);
    }
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}
