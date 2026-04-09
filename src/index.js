const axios = require("axios");
const { Telegraf } = require("telegraf");
const { config } = require("./config");
const { createDatabaseClient } = require("./db");
const { encryptSsn } = require("./encryption");
const { parseApplicantMessage } = require("./parser");

const FORMAT_HELP =
  'Send data in this format:\n"First Name, Last Name, DOB, SSN, Email, Phone"';

async function verifyTelegramToken(botToken) {
  const url = `https://api.telegram.org/bot${botToken}/getMe`;
  const response = await axios.get(url);

  if (!response.data?.ok) {
    throw new Error("Unable to verify Telegram bot token.");
  }

  console.log("Connected Telegram bot:", response.data.result.username);
}

async function bootstrap() {
  const db = createDatabaseClient(config.databaseUrl);
  await db.init();

  await verifyTelegramToken(config.botToken);

  const bot = new Telegraf(config.botToken);

  bot.start((ctx) => {
    return ctx.reply(
      `Welcome to cyr-onboarding-agent.\n${FORMAT_HELP}`,
    );
  });

  bot.on("text", async (ctx) => {
    try {
      const parsed = parseApplicantMessage(ctx.message.text);
      const encryptedSsn = encryptSsn(parsed.ssn, config.encryptionKey);

      // Requirement: log all parsed fields to console.
      console.log({
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        dob: parsed.dob,
        ssn: parsed.ssn,
        email: parsed.email,
        phone: parsed.phone,
      });

      await db.insertSubmission({
        ...parsed,
        encryptedSsn,
      });

      await ctx.reply("Data received and stored securely.");
    } catch (error) {
      console.error("Failed to process message:", error);
      await ctx.reply(
        `Could not process your message.\n${FORMAT_HELP}\n\nError: ${error.message}`,
      );
    }
  });

  await bot.launch();
  console.log("Bot is running...");

  const gracefulShutdown = async (signal) => {
    console.log(`Received ${signal}. Stopping bot...`);
    bot.stop(signal);
    await db.close();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void gracefulShutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void gracefulShutdown("SIGTERM");
  });
}

bootstrap().catch((error) => {
  console.error("Application failed to start:", error);
  process.exit(1);
});
