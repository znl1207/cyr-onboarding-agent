const dotenv = require('dotenv');

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function loadConfig() {
  return {
    botToken: requireEnv('TELEGRAM_BOT_TOKEN'),
    databaseUrl: requireEnv('DATABASE_URL'),
    encryptionKey: requireEnv('ENCRYPTION_KEY'),
  };
}

module.exports = {
  loadConfig,
};
