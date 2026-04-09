const crypto = require("crypto");

function getAesKey(encryptionKey) {
  return crypto.createHash("sha256").update(encryptionKey, "utf8").digest();
}

function encryptSsn(ssn, encryptionKey) {
  const key = getAesKey(encryptionKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(ssn, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString(
    "hex",
  )}`;
}

module.exports = { encryptSsn };
