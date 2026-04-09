const axios = require('axios');
const { Telegraf } = require('telegraf');

const { saveSubmission } = require('./database');
const { encryptSsn } = require('../utils/encryption');
const { parseOnboardingMessage } = require('../utils/parser');

function createBot({ telegramBotToken, encryptionKey, pool }) {
  const bot = new Telegraf(telegramBotToken);

  bot.start((ctx) => {
    return ctx.reply(
      'Send onboarding details in this format:\nFirst Name, Last Name, DOB, SSN, Email, Phone'
    );
  });

  bot.on('text', async (ctx) => {
    try {
      const parsedSubmission = parseOnboardingMessage(ctx.message.text);

      console.log('Received onboarding submission:');
      console.log('First Name:', parsedSubmission.firstName);
      console.log('Last Name:', parsedSubmission.lastName);
      console.log('DOB:', parsedSubmission.dob);
      console.log('SSN:', parsedSubmission.ssn);
      console.log('Email:', parsedSubmission.email);
      console.log('Phone:', parsedSubmission.phone);

      const savedSubmission = await saveSubmission(pool, {
        ...parsedSubmission,
        encryptedSsn: encryptSsn(parsedSubmission.ssn, encryptionKey),
      });

      await ctx.reply(
        `Submission saved successfully with ID ${savedSubmission.id}.`
      );
    } catch (error) {
      console.error('Failed to process onboarding submission:', error);

      await ctx.reply(
        `${error.message}\n\nExpected format:\nFirst Name, Last Name, DOB, SSN, Email, Phone`
      );
    }
  });

  return bot;
}

async function logBotProfile(telegramBotToken) {
  const response = await axios.get(
    `https://api.telegram.org/bot${telegramBotToken}/getMe`
  );

  const botProfile = response.data.result;

  console.log(
    `Connected to Telegram bot ${botProfile.username || botProfile.first_name} (${botProfile.id}).`
  );
}

module.exports = {
  createBot,
  logBotProfile,
};
