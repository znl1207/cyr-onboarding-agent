const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

function deriveKey(encryptionSecret) {
  return crypto.createHash('sha256').update(encryptionSecret).digest();
}

function encrypt(plainText, encryptionSecret) {
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const key = deriveKey(encryptionSecret);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encryptedBuffer = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encryptedBuffer.toString('hex'),
  ].join(':');
}

module.exports = {
  encrypt,
};
