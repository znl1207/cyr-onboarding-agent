const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function deriveAes256Key(rawKey) {
  return crypto.createHash("sha256").update(rawKey, "utf8").digest();
}

function encryptSSN(ssn, encryptionKey) {
  if (!ssn) {
    throw new Error("SSN is required for encryption.");
  }

  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY is required.");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveAes256Key(encryptionKey);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encryptedBuffer = Buffer.concat([
    cipher.update(ssn, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString(
    "hex"
  )}:${encryptedBuffer.toString("hex")}`;
}

module.exports = {
  encryptSSN,
};
