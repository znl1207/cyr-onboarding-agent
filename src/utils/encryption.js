const crypto = require('crypto');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 16;

function deriveKey(secret) {
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptSsn(ssn, secret) {
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const key = deriveKey(secret);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(ssn, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

module.exports = {
  encryptSsn,
};
