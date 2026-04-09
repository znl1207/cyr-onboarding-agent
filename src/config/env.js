const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function getRequiredEnvVar(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

module.exports = {
  botToken: getRequiredEnvVar('BOT_TOKEN'),
  databaseUrl: getRequiredEnvVar('DATABASE_URL'),
  encryptionKey: getRequiredEnvVar('ENCRYPTION_KEY'),
};
