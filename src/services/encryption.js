const crypto = require("crypto");
const { ENCRYPTION_KEY } = require("../config/env");

function deriveAesKey(secret) {
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

function encryptSSN(ssn) {
  const key = deriveAesKey(ENCRYPTION_KEY);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(ssn, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

module.exports = {
  encryptSSN,
};
