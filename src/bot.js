const { Telegraf } = require("telegraf");
const axios = require("axios");
const { BOT_TOKEN } = require("./config/env");
const { parseOnboardingMessage } = require("./services/parser");
const { saveSubmission } = require("./services/submissionService");

function createBot() {
  const bot = new Telegraf(BOT_TOKEN);

  bot.start(async (ctx) => {
    let greeting =
      "Send onboarding data in this format:\nFirst Name, Last Name, DOB, SSN, Email, Phone";

    try {
      const response = await axios.get("https://api.github.com/zen", {
        timeout: 3000,
        headers: { "User-Agent": "cyr-onboarding-agent" },
      });
      greeting += `\n\nTip: ${response.data}`;
    } catch (error) {
      // This helper call is optional and should not block bot usage.
    }

    await ctx.reply(greeting);
  });

  bot.on("text", async (ctx) => {
    const messageText = ctx.message.text;

    try {
      const parsed = parseOnboardingMessage(messageText);
      console.log("Received onboarding data:", parsed);

      const submissionId = await saveSubmission(parsed);

      await ctx.reply(
        `Submission saved successfully with id ${submissionId}.`,
      );
    } catch (error) {
      console.error("Failed to process onboarding message:", error.message);
      await ctx.reply(
        "Invalid format. Please send:\nFirst Name, Last Name, DOB, SSN, Email, Phone",
      );
    }
  });

  bot.catch((error) => {
    console.error("Unhandled bot error:", error);
  });

  return bot;
}

module.exports = {
  createBot,
};
