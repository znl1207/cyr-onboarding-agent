const EXPECTED_FIELD_COUNT = 6;
const submissionFormat =
  'First Name, Last Name, DOB, SSN, Email, Phone';

function parseSubmissionMessage(messageText) {
  const parts = messageText
    .split(',')
    .map((part) => part.trim());

  if (
    parts.length !== EXPECTED_FIELD_COUNT ||
    parts.some((part) => part.length === 0)
  ) {
    return null;
  }

  const [firstName, lastName, dob, ssn, email, phone] = parts;

  return {
    firstName,
    lastName,
    dob,
    ssn,
    email,
    phone,
  };
}

module.exports = {
  parseSubmissionMessage,
  submissionFormat,
};
