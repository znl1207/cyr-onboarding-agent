const test = require('node:test');
const assert = require('node:assert/strict');

const { encryptSsn } = require('../src/crypto');
const { parseOnboardingMessage } = require('../src/parser');

test('parseOnboardingMessage parses the expected comma-separated format', () => {
  const parsed = parseOnboardingMessage(
    'Jane, Doe, 1990-05-20, 123-45-6789, jane.doe@example.com, +1 555-123-4567'
  );

  assert.deepEqual(parsed, {
    firstName: 'Jane',
    lastName: 'Doe',
    dob: '1990-05-20',
    ssn: '123-45-6789',
    email: 'jane.doe@example.com',
    phone: '+1 555-123-4567',
  });
});

test('parseOnboardingMessage rejects malformed messages', () => {
  assert.throws(
    () => parseOnboardingMessage('Jane, Doe, 1990-05-20, jane.doe@example.com'),
    /Invalid message format/
  );
});

test('encryptSsn returns an AES-256-GCM payload without exposing plaintext', () => {
  const encrypted = encryptSsn('123-45-6789', 'test-secret');
  const parts = encrypted.split(':');

  assert.equal(parts.length, 3);
  assert.match(parts[0], /^[0-9a-f]+$/);
  assert.match(parts[1], /^[0-9a-f]+$/);
  assert.match(parts[2], /^[0-9a-f]+$/);
  assert.ok(!encrypted.includes('123-45-6789'));
});
