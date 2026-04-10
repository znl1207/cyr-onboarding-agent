const dotenv = require("dotenv");

dotenv.config();

function getEnvVar(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }

  return undefined;
}

function getRequiredEnvVar(...names) {
  const value = getEnvVar(...names);
  if (!value) {
    throw new Error(
      `Missing required environment variable. Expected one of: ${names.join(
        ", ",
      )}`,
    );
  }
  return value;
}

function parseBoolean(value, fallback = false) {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parsePort(value, fallback = 3000) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function cleanCredential(value) {
  if (typeof value !== "string") {
    return value;
  }

  // Handle accidental quotes/spaces when copying secrets from dashboards.
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function parseCsvList(value) {
  if (!value) {
    return [];
  }

  return cleanCredential(String(value))
    .split(",")
    .map((item) => cleanCredential(item))
    .filter(Boolean);
}

const config = {
  appName: process.env.APP_NAME || "cyr-onboarding-agent",
  nodeEnv: process.env.NODE_ENV || "development",
  port: parsePort(process.env.PORT, 3000),
  telegramBotToken: getRequiredEnvVar("TELEGRAM_BOT_TOKEN", "BOT_TOKEN"),
  adminChatId: process.env.ADMIN_CHAT_ID,
  databaseUrl: getRequiredEnvVar("DATABASE_URL"),
  encryptionKey: getRequiredEnvVar("ENCRYPTION_KEY"),
  crc: {
    apiKey: cleanCredential(process.env.CRC_API_KEY),
    secretKey: cleanCredential(process.env.CRC_SECRET_KEY),
    apiMode: getEnvVar("CRC_MODE", "CRC_API_MODE") || "auto",
    baseUrl: process.env.CRC_BASE_URL || "https://app.creditrepaircloud.com",
    createClientPath:
      process.env.CRC_CREATE_CLIENT_PATH || "/api/lead/insertRecord",
    clientStatus: process.env.CRC_CLIENT_STATUS || "Client",
    statusCandidates: parseCsvList(
      getEnvVar("CRC_STATUS_CANDIDATES", "CRC_CLIENT_STATUS_CANDIDATES"),
    ),
    referredByFirstName: process.env.CRC_REFERRED_BY_FIRST_NAME || "Zayn",
    referredByLastName: process.env.CRC_REFERRED_BY_LAST_NAME || "Lakhani",
    clientAgreement: process.env.CRC_CLIENT_AGREEMENT,
    portalAccessEnabled: parseBoolean(
      process.env.CRC_PORTAL_ACCESS_ENABLED,
      true,
    ),
    sendPortalPasswordEmail: parseBoolean(
      process.env.CRC_SEND_PORTAL_PASSWORD_EMAIL,
      true,
    ),
    usePlaywrightFallback: parseBoolean(
      process.env.CRC_USE_PLAYWRIGHT_FALLBACK,
      false,
    ),
    playwrightHeadless: parseBoolean(process.env.PLAYWRIGHT_HEADLESS, true),
    playwrightLoginUrl: process.env.CRC_PLAYWRIGHT_LOGIN_URL,
    playwrightUsername: process.env.CRC_PLAYWRIGHT_USERNAME,
    playwrightPassword: process.env.CRC_PLAYWRIGHT_PASSWORD,
  },
  ghl: {
    apiKey: process.env.GHL_API_KEY,
    baseUrl:
      process.env.GHL_BASE_URL || "https://services.leadconnectorhq.com",
    contactPath: process.env.GHL_CONTACT_PATH || "/contacts/",
    opportunityPath: process.env.GHL_OPPORTUNITY_PATH || "/opportunities/",
    locationId: process.env.GHL_LOCATION_ID,
    pipelineId: process.env.GHL_PIPELINE_ID,
    onboardingStageId: process.env.GHL_ONBOARDING_STAGE_ID,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
    approvalMessageTemplate:
      process.env.TWILIO_APPROVAL_TEMPLATE ||
      "You're all set! Disputes will be sent out within the next 24 hours. Any questions? Reach us at 954-770-3006",
  },
};

module.exports = { config };
