function normalizeDob(value) {
  const input = String(value || "").trim();
  const match = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) {
    throw new Error("DOB must use MM/DD/YYYY format (for example: 01/31/1990).");
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const dob = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(dob.getTime()) ||
    dob.getUTCFullYear() !== year ||
    dob.getUTCMonth() !== month - 1 ||
    dob.getUTCDate() !== day
  ) {
    throw new Error("DOB must be a real calendar date (for example: 01/31/1990).");
  }

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
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

  const compactPatternMatch = input
    .trim()
    .match(/^\/?approve(?:d)?(?:@[a-z0-9_]+)?#?(\d+)$/i);
  if (compactPatternMatch) {
    return {
      submissionId: Number(compactPatternMatch[1]),
    };
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
    /\bapprove(?:d)?\b/i.test(sanitized) ||
    /^\/approve(?:d)?(?:@[a-z0-9_]+)?/i.test(sanitized);

  if (!hasApproveKeyword) {
    return null;
  }

  const idMatch = sanitized.match(/(?:^|\s)#?(\d+)(?:\s|$)/);
  return {
    submissionId: idMatch ? Number(idMatch[1]) : null,
  };
}

function parseDocsReceivedCommand(input) {
  if (typeof input !== "string") {
    return null;
  }

  const compactPatternMatch = input
    .trim()
    .match(/^\/?(?:docs[_\s-]*received|docsdone)(?:@[a-z0-9_]+)?#?(\d+)$/i);
  if (compactPatternMatch) {
    return {
      submissionId: Number(compactPatternMatch[1]),
    };
  }

  const sanitized = input
    .replace(/[^\w\s/#@-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const hasDocsKeyword =
    /\bdocs(?:\s+received|\s*done)?\b/i.test(sanitized) ||
    /^\/?docs[_\s-]*received(?:@[a-z0-9_]+)?/i.test(sanitized);
  if (!hasDocsKeyword) {
    return null;
  }

  const idMatch = sanitized.match(/(?:^|\s)#?(\d+)(?:\s|$)/);
  if (!idMatch) {
    return null;
  }

  return {
    submissionId: Number(idMatch[1]),
  };
}

module.exports = {
  parseApplicantMessage,
  parseApprovalCommand,
  parseDocsReceivedCommand,
};
