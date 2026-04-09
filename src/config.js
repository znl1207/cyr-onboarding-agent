const dotenv = require("dotenv");

dotenv.config();

const REQUIRED_ENV_VARS = ["BOT_TOKEN", "DATABASE_URL", "ENCRYPTION_KEY"];
const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

const shouldUseSsl = () => {
  if (process.env.DATABASE_SSL) {
    return process.env.DATABASE_SSL.toLowerCase() === "true";
  }

  return /railway/i.test(process.env.DATABASE_URL);
};

module.exports = {
  botToken: process.env.BOT_TOKEN,
  databaseUrl: process.env.DATABASE_URL,
  encryptionKey: process.env.ENCRYPTION_KEY,
  dbSslEnabled: shouldUseSsl(),
};
