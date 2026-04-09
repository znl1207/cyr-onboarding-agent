const dotenv = require("dotenv");

dotenv.config();

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

module.exports = {
  BOT_TOKEN: getRequiredEnv("BOT_TOKEN"),
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),
  ENCRYPTION_KEY: getRequiredEnv("ENCRYPTION_KEY"),
  NODE_ENV: process.env.NODE_ENV || "development",
};
