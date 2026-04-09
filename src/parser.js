/**
 * Expected: "First Name, Last Name, DOB, SSN, Email, Phone"
 * @param {string} text
 * @returns {{ firstName: string, lastName: string, dob: string, ssn: string, email: string, phone: string }}
 */
function parseOnboardingMessage(text) {
  const raw = String(text).trim();
  const parts = raw.split(',').map((p) => p.trim());

  if (parts.length !== 6) {
    const err = new Error(
      'Invalid format. Send exactly six comma-separated fields: First Name, Last Name, DOB, SSN, Email, Phone'
    );
    err.code = 'PARSE_ERROR';
    throw err;
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

module.exports = { parseOnboardingMessage };
