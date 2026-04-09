const axios = require('axios');
const { Telegraf } = require('telegraf');

const { encryptSsn } = require('./crypto');
const { parseOnboardingMessage } = require('./parser');

const EXPECTED_FORMAT = 'First Name, Last Name, DOB, SSN, Email, Phone';

function createBot({ botToken, database, encryptionKey }) {
  const bot = new Telegraf(botToken);

  bot.start(async (ctx) => {
    await ctx.reply(`Send onboarding data in this format:\n${EXPECTED_FORMAT}`);
  });

  bot.on('text', async (ctx) => {
    try {
      const submission = parseOnboardingMessage(ctx.message.text);

      console.log('Received onboarding submission:', submission);

      const encryptedSsn = encryptSsn(submission.ssn, encryptionKey);
      const savedRecord = await database.saveSubmission({
        firstName: submission.firstName,
        lastName: submission.lastName,
        dob: submission.dob,
        encryptedSsn,
        email: submission.email,
        phone: submission.phone,
      });

      console.log('Saved onboarding submission:', savedRecord);
      await ctx.reply('Onboarding details received and stored securely.');
    } catch (error) {
      console.error('Failed to process onboarding message:', error);

      const isFormatError = error.message.includes('Invalid message format');
      const replyMessage = isFormatError
        ? `Invalid format. Please use:\n${EXPECTED_FORMAT}`
        : 'Something went wrong while saving your onboarding details.';

      await ctx.reply(replyMessage);
    }
  });

  bot.catch((error) => {
    console.error('Unhandled Telegram bot error:', error);
  });

  return bot;
}

async function validateBotToken(botToken) {
  const response = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);

  if (!response.data.ok) {
    throw new Error('Telegram bot token validation failed.');
  }

  return response.data.result;
}

module.exports = {
  createBot,
  validateBotToken,
};
