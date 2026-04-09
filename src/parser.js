const EXPECTED_FIELD_FORMAT =
  "First Name, Last Name, DOB, SSN, Email, Phone";

function parseOnboardingMessage(messageText) {
  if (typeof messageText !== "string" || !messageText.trim()) {
    throw new Error("Message must be a non-empty string.");
  }

  const fields = messageText.split(",").map((field) => field.trim());

  if (fields.length !== 6 || fields.some((field) => !field)) {
    throw new Error(
      `Invalid format. Expected: ${EXPECTED_FIELD_FORMAT}`
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
  EXPECTED_FIELD_FORMAT,
};
