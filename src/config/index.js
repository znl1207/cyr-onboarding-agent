const dotenv = require('dotenv');

dotenv.config();

const requiredVariables = ['TELEGRAM_BOT_TOKEN', 'DATABASE_URL', 'ENCRYPTION_KEY'];

for (const variableName of requiredVariables) {
  if (!process.env[variableName]) {
    throw new Error(`Missing required environment variable: ${variableName}`);
  }
}

module.exports = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  databaseUrl: process.env.DATABASE_URL,
  encryptionKey: process.env.ENCRYPTION_KEY,
};
