const axios = require("axios");
const { Telegraf } = require("telegraf");
const { botToken, encryptionKey } = require("./config");
const { encryptSSN } = require("./encryption");
const { initializeDatabase, pool, saveSubmission } = require("./database");
const { EXPECTED_FIELD_FORMAT, parseOnboardingMessage } = require("./parser");

const bot = new Telegraf(botToken);

async function validateBotToken() {
  const url = `https://api.telegram.org/bot${botToken}/getMe`;
  const response = await axios.get(url, { timeout: 10000 });

  if (!response.data?.ok) {
    throw new Error("Failed to validate BOT_TOKEN.");
  }

  const username = response.data?.result?.username || "(unknown)";
  console.log(`Connected to Telegram bot: ${username}`);
}

bot.start(async (ctx) => {
  await ctx.reply(`Send onboarding data in this format:\n${EXPECTED_FIELD_FORMAT}`);
});

bot.on("text", async (ctx) => {
  try {
    const submission = parseOnboardingMessage(ctx.message.text);
    console.log("Received onboarding submission:", submission);

    const encryptedSsn = encryptSSN(submission.ssn, encryptionKey);
    const row = await saveSubmission({
      ...submission,
      encryptedSsn,
    });

    await ctx.reply(`Submission saved successfully. Record ID: ${row.id}`);
  } catch (error) {
    console.error("Failed to process onboarding message:", error.message);
    await ctx.reply(
      `Invalid input or server error.\nUse this format:\n${EXPECTED_FIELD_FORMAT}`
    );
  }
});

bot.catch((error) => {
  console.error("Unhandled bot error:", error);
});

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);

  try {
    bot.stop(signal);
    await pool.end();
  } finally {
    process.exit(0);
  }
}

async function bootstrap() {
  await initializeDatabase();
  await validateBotToken();
  await bot.launch();
  console.log("Bot is running.");

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch(async (error) => {
  console.error("Failed to start bot:", error);
  await pool.end();
  process.exit(1);
});
