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

  const trimmed = input.trim();
  const normalized = trimmed.replace(/[.!]+$/g, "");
  // Support private and group command styles:
  // APPROVE 12
  // /approve 12
  // /approve@CYR_onboarding_bot 12
  const strictMatch = normalized.match(
    /^\/?approve(?:@[a-z0-9_]+)?(?:\s*(?:#|id[:\s]*)?\s*(\d+))?$/i,
  );

  if (strictMatch) {
    return {
      submissionId: strictMatch[1] ? Number(strictMatch[1]) : null,
    };
  }

  // Fallback for slightly noisy input that still starts with approve.
  // Examples: "APPROVE pls 12", "/approve now #12"
  if (/^\/?approve\b/i.test(normalized)) {
    const idMatch = normalized.match(/(\d+)/);
    return {
      submissionId: idMatch ? Number(idMatch[1]) : null,
    };
  }

  return null;
}

module.exports = { parseApplicantMessage, parseApprovalCommand };
