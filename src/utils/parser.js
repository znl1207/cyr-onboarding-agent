const EXPECTED_FIELD_COUNT = 6;

function parseOnboardingMessage(messageText) {
  const segments = messageText.split(',').map((segment) => segment.trim());

  if (segments.length !== EXPECTED_FIELD_COUNT) {
    throw new Error(
      'Invalid format. Use: First Name, Last Name, DOB, SSN, Email, Phone'
    );
  }

  const [firstName, lastName, dob, ssn, email, phone] = segments;

  if ([firstName, lastName, dob, ssn, email, phone].some((field) => field.length === 0)) {
    throw new Error('All six fields are required.');
  }

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
