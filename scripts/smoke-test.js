const { parseApplicantMessage, parseApprovalCommand } = require("../src/parser");
const { encryptSsn } = require("../src/encryption");

function loadConfigForSmokeTest(overrides = {}) {
  const keysToReset = [
    "BOT_TOKEN",
    "TELEGRAM_BOT_TOKEN",
    "DATABASE_URL",
    "ENCRYPTION_KEY",
    "CRC_API_KEY",
    "CRC_SECRET_KEY",
    "CRC_STATUS_CANDIDATES",
    "CRC_CLIENT_STATUS_CANDIDATES",
  ];

  for (const key of keysToReset) {
    delete process.env[key];
  }

  Object.assign(process.env, {
    TELEGRAM_BOT_TOKEN: "local-smoke-test-token",
    DATABASE_URL: "postgres://example",
    ENCRYPTION_KEY: "local-smoke-test-key",
    ...overrides,
  });

  delete require.cache[require.resolve("../src/config")];
  return require("../src/config").config;
}

function runSmokeTest() {
  const sample =
    "Jane, Doe, 1990-01-31, 123-45-6789, jane@example.com, +15551234567";

  const parsed = parseApplicantMessage(sample);
  const approval = parseApprovalCommand("APPROVE 7");
  const groupApproval = parseApprovalCommand("/approve@CYR_onboarding_bot 7");
  const punctuatedApproval = parseApprovalCommand("APPROVE #7.");
  const voiceStyleApproval = parseApprovalCommand("approve id 7!");
  const pastTenseApproval = parseApprovalCommand("approved 7");
  const noSpaceApproval = parseApprovalCommand("Approve9");
  const encrypted = encryptSsn(parsed.ssn, "local-smoke-test-key");
  const aliasStatusConfig = loadConfigForSmokeTest({
    CRC_API_KEY: " 'quoted-api-key' ",
    CRC_SECRET_KEY: ' "quoted-secret-key" ',
    CRC_CLIENT_STATUS_CANDIDATES: '"Client, Active Prospect"',
  });
  const primaryStatusConfig = loadConfigForSmokeTest({
    CRC_STATUS_CANDIDATES: 'Client, "Active Prospect"',
  });

  const checks = [
    ["firstName parsed", parsed.firstName === "Jane"],
    ["lastName parsed", parsed.lastName === "Doe"],
    ["dob normalized", parsed.dob === "1990-01-31"],
    ["approval parsed", approval && approval.submissionId === 7],
    ["group approval parsed", groupApproval && groupApproval.submissionId === 7],
    [
      "punctuated approval parsed",
      punctuatedApproval && punctuatedApproval.submissionId === 7,
    ],
    [
      "voice-style approval parsed",
      voiceStyleApproval && voiceStyleApproval.submissionId === 7,
    ],
    [
      "past-tense approval parsed",
      pastTenseApproval && pastTenseApproval.submissionId === 7,
    ],
    [
      "no-space approval parsed",
      noSpaceApproval && noSpaceApproval.submissionId === 9,
    ],
    ["encrypted format", encrypted.split(":").length === 3],
    ["CRC API key cleaned", aliasStatusConfig.crc.apiKey === "quoted-api-key"],
    [
      "CRC secret key cleaned",
      aliasStatusConfig.crc.secretKey === "quoted-secret-key",
    ],
    [
      "CRC alias status candidates parsed",
      JSON.stringify(aliasStatusConfig.crc.statusCandidates) ===
        JSON.stringify(["Client", "Active Prospect"]),
    ],
    [
      "CRC primary status candidates parsed",
      JSON.stringify(primaryStatusConfig.crc.statusCandidates) ===
        JSON.stringify(["Client", "Active Prospect"]),
    ],
  ];

  const failedChecks = checks.filter(([, ok]) => !ok);
  if (failedChecks.length > 0) {
    console.error("Smoke test failed:", failedChecks.map(([name]) => name));
    process.exit(1);
  }

  console.log("Smoke test passed.");
  process.exit(0);
}

runSmokeTest();
