require('dotenv').config();

const axios = require('axios');
const { Telegraf } = require('telegraf');

const { encryptAes256 } = require('./crypto');
const { createPool, ensureSchema, insertSubmission } = require('./db');
const { parseOnboardingMessage } = require('./parser');

const BOT_TOKEN = process.env.BOT_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

requireEnv('BOT_TOKEN', BOT_TOKEN);
requireEnv('DATABASE_URL', DATABASE_URL);
requireEnv('ENCRYPTION_KEY', ENCRYPTION_KEY);

const pool = createPool(DATABASE_URL);

async function verifyTelegramToken() {
  const { data } = await axios.get(
    `https://api.telegram.org/bot${BOT_TOKEN}/getMe`,
    { timeout: 15000 }
  );
  if (!data.ok) {
    throw new Error('Telegram getMe failed');
  }
  console.log('Telegram bot:', data.result.username);
}

async function main() {
  await verifyTelegramToken();
  await ensureSchema(pool);
  console.log('Database schema ready.');

  const bot = new Telegraf(BOT_TOKEN);

  bot.start((ctx) =>
    ctx.reply(
      'Send onboarding data as:\nFirst Name, Last Name, DOB, SSN, Email, Phone'
    )
  );

  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    let fields;
    try {
      fields = parseOnboardingMessage(text);
    } catch (e) {
      if (e.code === 'PARSE_ERROR') {
        await ctx.reply(e.message);
        return;
      }
      throw e;
    }

    console.log('Received onboarding fields:', {
      firstName: fields.firstName,
      lastName: fields.lastName,
      dob: fields.dob,
      ssn: fields.ssn,
      email: fields.email,
      phone: fields.phone,
    });

    const ssnEncrypted = encryptAes256(fields.ssn, ENCRYPTION_KEY);

    try {
      const row = await insertSubmission(pool, {
        firstName: fields.firstName,
        lastName: fields.lastName,
        dob: fields.dob,
        ssnEncrypted,
        email: fields.email,
        phone: fields.phone,
      });
      await ctx.reply(`Saved (id ${row.id}).`);
    } catch (err) {
      console.error('Database error:', err);
      await ctx.reply('Could not save. Please try again later.');
    }
  });

  bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    if (ctx?.reply) {
      ctx.reply('Something went wrong.').catch(() => {});
    }
  });

  await bot.launch();
  console.log('Bot is running. Press Ctrl+C to stop.');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
