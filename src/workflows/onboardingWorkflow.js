const { encryptSsn } = require("../encryption");

async function createOnboardingSubmission({
  parsedApplicant,
  sourceChatId,
  sourceUserId,
  database,
  config,
  crcService,
  ghlService,
  zapierService,
}) {
  const encryptedSsn = encryptSsn(parsedApplicant.ssn, config.encryptionKey);

  const submission = await database.createSubmission({
    sourceChatId,
    sourceUserId,
    firstName: parsedApplicant.firstName,
    lastName: parsedApplicant.lastName,
    dob: parsedApplicant.dob,
    encryptedSsn,
    email: parsedApplicant.email,
    phone: parsedApplicant.phone,
  });

  const crcResult = config.zapier.enabled
    ? await zapierService.sendOnboardingEvent({
        ...parsedApplicant,
        submissionId: submission.id,
        sourceChatId,
        sourceUserId,
      })
    : await crcService.createClient(parsedApplicant);
  await database.updateCrcResult(submission.id, crcResult);

  const ghlResult = await ghlService.createOnboardingContact(parsedApplicant);
  await database.updateGhlResult(submission.id, ghlResult);

  await database.markApprovalRequested(submission.id);

  return {
    submissionId: submission.id,
    submission,
    crcResult,
    ghlResult,
  };
}

module.exports = { createOnboardingSubmission };
