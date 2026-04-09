const { Telegraf } = require('telegraf');
const { botToken, encryptionKey } = require('./config/env');
const { saveSubmission } = require('./services/submissions');
const { encrypt } = require('./utils/encryption');
const { parseSubmissionMessage, submissionFormat } = require('./utils/parser');

function createBot() {
  const bot = new Telegraf(botToken);

  bot.start((ctx) => {
    return ctx.reply(
      `Send onboarding details in this format:\n${submissionFormat}`
    );
  });

  bot.on('text', async (ctx) => {
    const submission = parseSubmissionMessage(ctx.message.text);

    if (!submission) {
      await ctx.reply(
        `Invalid format. Please send:\n${submissionFormat}`
      );
      return;
    }

    console.log('Received onboarding submission:', submission);

    const encryptedSsn = encrypt(submission.ssn, encryptionKey);
    const savedSubmission = await saveSubmission({
      ...submission,
      encryptedSsn,
    });

    console.log(
      `Stored onboarding submission ${savedSubmission.id} at ${savedSubmission.created_at}`
    );

    await ctx.reply('Your onboarding details were received and stored securely.');
  });

  bot.catch(async (error, ctx) => {
    console.error('Telegram bot error:', error);

    try {
      await ctx.reply('Something went wrong while processing your submission.');
    } catch (replyError) {
      console.error('Failed to send Telegram error message:', replyError);
    }
  });

  return bot;
}

module.exports = {
  createBot,
};
