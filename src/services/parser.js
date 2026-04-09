function parseOnboardingMessage(messageText) {
  if (!messageText || typeof messageText !== "string") {
    throw new Error("Message must be a non-empty string.");
  }

  const parts = messageText.split(",").map((part) => part.trim());

  if (parts.length !== 6) {
    throw new Error("Expected 6 comma-separated values.");
  }

  const [firstName, lastName, dob, ssn, email, phone] = parts;

  if (parts.some((part) => part.length === 0)) {
    throw new Error("Each field must be provided.");
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
