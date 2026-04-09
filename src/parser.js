const EXPECTED_FIELD_COUNT = 6;

function parseOnboardingMessage(messageText) {
  const fields = messageText.split(',').map((value) => value.trim());

  if (fields.length !== EXPECTED_FIELD_COUNT || fields.some((value) => !value)) {
    throw new Error(
      'Invalid message format. Use: First Name, Last Name, DOB, SSN, Email, Phone'
    );
  }

  const [firstName, lastName, dob, ssn, email, phone] = fields;

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
  parseOnboardingMessage,
};
