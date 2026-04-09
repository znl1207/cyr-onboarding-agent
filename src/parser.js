function normalizeDob(value) {
  const dob = new Date(value);

  if (Number.isNaN(dob.getTime())) {
    throw new Error("DOB must be a valid date (for example: 1990-01-31).");
  }

  return dob.toISOString().slice(0, 10);
}

function parseApplicantMessage(input) {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error("Message is empty.");
  }

  const parts = input.split(",").map((segment) => segment.trim());

  if (parts.length !== 6) {
    throw new Error(
      'Invalid format. Use: "First Name, Last Name, DOB, SSN, Email, Phone"',
    );
  }

  const [firstName, lastName, dobRaw, ssn, email, phone] = parts;

  if (!firstName || !lastName || !dobRaw || !ssn || !email || !phone) {
    throw new Error("All six fields are required.");
  }

  return {
    firstName,
    lastName,
    dob: normalizeDob(dobRaw),
    ssn,
    email,
    phone,
  };
}

function parseApprovalCommand(input) {
  if (typeof input !== "string") {
    return null;
  }

  const sanitized = input
    .replace(/[^\w\s/#@-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Highly tolerant matching for real-world typing/voice input.
  // Examples accepted:
  // - APPROVE
  // - APPROVE 12
  // - /approve@CYR_onboarding_bot id 12!
  // - please approve #12
  const hasApproveKeyword =
    /\bapprove\b/i.test(sanitized) ||
    /^\/approve(?:@[a-z0-9_]+)?/i.test(sanitized);

  if (!hasApproveKeyword) {
    return null;
  }

  const idMatch = sanitized.match(/(?:^|\s)#?(\d+)(?:\s|$)/);
  return {
    submissionId: idMatch ? Number(idMatch[1]) : null,
  };
}

module.exports = { parseApplicantMessage, parseApprovalCommand };
