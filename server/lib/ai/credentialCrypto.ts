// server/lib/ai/credentialCrypto.ts
// AES-256-GCM encryption/decryption for user API keys (BYOK).
//
// Security properties:
//  - AES-256-GCM: authenticated encryption — detects tampering
//  - Unique random 12-byte IV per encryption — never reused
//  - 16-byte authentication tag stored with ciphertext
//  - Encryption key: 32 bytes from CREDENTIAL_ENCRYPTION_KEY env (base64)
//  - Plaintext key exists ONLY in backend memory during encrypt/decrypt
//  - StoredCredential JSON is safe to persist in DB (no plaintext)
//
// NEVER log plaintext, NEVER return it to the client after encryption.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;   // GCM standard nonce length
const TAG_BYTES = 16;  // GCM auth tag length

export interface StoredCredential {
  iv: string;    // base64
  tag: string;   // base64
  data: string;  // base64 ciphertext
}

/**
 * Returns the 32-byte encryption key from the environment.
 * Throws clearly if the key is missing or wrong length.
 */
function getEncryptionKey(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY environment variable is required for BYOK encryption. " +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32 bytes (got ${key.length}). ` +
      "Regenerate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  return key;
}

/**
 * Encrypts a plaintext secret (e.g. API key) using AES-256-GCM.
 * Returns a StoredCredential that is safe to persist in the database.
 *
 * @param plaintext  The raw API key string. Must be non-empty.
 * @returns          StoredCredential with iv, tag, data (all base64).
 */
export function encryptCredential(plaintext: string): StoredCredential {
  if (!plaintext) throw new Error("encryptCredential: plaintext must be non-empty");

  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encryptedBuf = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encryptedBuf.toString("base64"),
  };
}

/**
 * Decrypts a StoredCredential back to the original plaintext API key.
 * Throws if the authentication tag is invalid (tampered data).
 *
 * @param stored  The StoredCredential retrieved from the database.
 * @returns       The original plaintext API key.
 */
export function decryptCredential(stored: StoredCredential): string {
  if (!stored?.iv || !stored?.tag || !stored?.data) {
    throw new Error("decryptCredential: invalid StoredCredential structure");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(stored.iv, "base64");
  const tag = Buffer.from(stored.tag, "base64");
  const data = Buffer.from(stored.data, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Extracts the last 4 characters of an API key for safe display.
 * Must be called on the plaintext key BEFORE encryption.
 * NEVER derive key_last4 by decrypting for display purposes.
 */
export function extractKeyLast4(plaintext: string): string {
  if (!plaintext || plaintext.length < 4) {
    throw new Error("extractKeyLast4: key must be at least 4 characters");
  }
  return plaintext.slice(-4);
}

/**
 * Serializes a StoredCredential to a single JSON string for DB storage.
 */
export function serializeCredential(stored: StoredCredential): string {
  return JSON.stringify(stored);
}

/**
 * Deserializes a StoredCredential from the DB column value.
 */
export function deserializeCredential(raw: string): StoredCredential {
  try {
    const parsed = JSON.parse(raw) as StoredCredential;
    if (!parsed.iv || !parsed.tag || !parsed.data) {
      throw new Error("Missing required fields");
    }
    return parsed;
  } catch {
    throw new Error("deserializeCredential: invalid stored credential format");
  }
}
