function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const clone = { ...metadata };
  const sensitiveKeys = [
    "ssn",
    "encryptedSsn",
    "encryptionKey",
    "authorization",
    "authToken",
    "apiKey",
    "password",
  ];

  for (const key of Object.keys(clone)) {
    if (sensitiveKeys.includes(key)) {
      clone[key] = "[REDACTED]";
    }
  }

  return clone;
}

function write(level, message, metadata) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  const sanitized = sanitizeMetadata(metadata);
  if (sanitized) {
    entry.metadata = sanitized;
  }

  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

function logInfo(message, metadata) {
  write("info", message, metadata);
}

function logWarn(message, metadata) {
  write("warn", message, metadata);
}

function logError(message, metadata) {
  write("error", message, metadata);
}

module.exports = {
  logInfo,
  logWarn,
  logError,
};
