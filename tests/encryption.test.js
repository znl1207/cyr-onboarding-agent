const { encryptSsn } = require("../src/encryption");

describe("encryptSsn", () => {
  const key = "test-encryption-key";

  it("returns iv:tag:ciphertext format", () => {
    const result = encryptSsn("123-45-6789", key);
    const parts = result.split(":");
    expect(parts).toHaveLength(3);
  });

  it("produces hex strings in all three segments", () => {
    const result = encryptSsn("123-45-6789", key);
    const parts = result.split(":");
    for (const part of parts) {
      expect(part).toMatch(/^[0-9a-f]+$/);
    }
  });

  it("produces unique output on each call (random IV)", () => {
    const a = encryptSsn("123-45-6789", key);
    const b = encryptSsn("123-45-6789", key);
    expect(a).not.toBe(b);
  });

  it("IV segment is 24 hex chars (12 bytes)", () => {
    const result = encryptSsn("999-88-7777", key);
    const iv = result.split(":")[0];
    expect(iv).toHaveLength(24);
  });

  it("auth tag segment is 32 hex chars (16 bytes)", () => {
    const result = encryptSsn("999-88-7777", key);
    const tag = result.split(":")[1];
    expect(tag).toHaveLength(32);
  });
});
