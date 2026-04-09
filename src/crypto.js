const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from ENCRYPTION_KEY (any string length).
 * @param {string} secret
 * @returns {Buffer}
 */
function deriveKey(secret) {
  return crypto.createHash('sha256').update(String(secret), 'utf8').digest();
}

/**
 * Encrypts plaintext with AES-256-GCM. Returns base64(iv + ciphertext + authTag).
 * @param {string} plaintext
 * @param {string} encryptionKey from process.env.ENCRYPTION_KEY
 * @returns {string}
 */
function encryptAes256(plaintext, encryptionKey) {
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is required');
  }
  const key = deriveKey(encryptionKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]).toString('base64');
}

module.exports = { encryptAes256, deriveKey };
