const dotenv = require("dotenv");

dotenv.config();

function getRequiredEnvVar(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const config = {
  botToken: getRequiredEnvVar("BOT_TOKEN"),
  databaseUrl: getRequiredEnvVar("DATABASE_URL"),
  encryptionKey: getRequiredEnvVar("ENCRYPTION_KEY"),
};

module.exports = { config };
