const {
  parseApplicantMessage,
  parseApprovalCommand,
  parseDocsReceivedCommand,
} = require("../src/parser");
const { encryptSsn } = require("../src/encryption");

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
  const docsReceived = parseDocsReceivedCommand("DOCS_RECEIVED 7");
  const encrypted = encryptSsn(parsed.ssn, "local-smoke-test-key");

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
    ["docs received parsed", docsReceived && docsReceived.submissionId === 7],
    ["encrypted format", encrypted.split(":").length === 3],
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
