const crypto = require('crypto');

function deriveAesKey(secret) {
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

function encryptSsn(ssn, secret) {
  const key = deriveAesKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(ssn, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

module.exports = {
  encryptSsn,
};
