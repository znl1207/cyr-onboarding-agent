const { Telegraf } = require('telegraf');
const { encrypt } = require('./crypto');
const { insertRecord } = require('./db');

const EXPECTED_FIELDS = 6;

// Expected format: "First Name, Last Name, DOB, SSN, Email, Phone"
function parseMessage(text) {
  const parts = text.split(',').map((p) => p.trim());
  if (parts.length !== EXPECTED_FIELDS) {
    throw new Error(
      `Expected ${EXPECTED_FIELDS} comma-separated fields but received ${parts.length}.`,
    );
  }

  const [firstName, lastName, dob, ssn, email, phone] = parts;

  if (!firstName || !lastName) throw new Error('First name and last name are required.');
  if (!dob) throw new Error('Date of birth is required.');
  if (!ssn) throw new Error('SSN is required.');
  if (!email || !email.includes('@')) throw new Error('A valid email address is required.');
  if (!phone) throw new Error('Phone number is required.');

  return { firstName, lastName, dob, ssn, email, phone };
}

function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');

  const bot = new Telegraf(token);

  bot.start((ctx) =>
    ctx.reply(
      'Welcome to the CYR Onboarding Agent!\n\n' +
        'Please send your details in the following format:\n' +
        '<code>First Name, Last Name, DOB, SSN, Email, Phone</code>\n\n' +
        'Example:\n' +
        '<code>John, Doe, 1990-01-15, 123-45-6789, john@example.com, +1-555-0100</code>',
      { parse_mode: 'HTML' },
    ),
  );

  bot.help((ctx) =>
    ctx.reply(
      'Send your onboarding info as:\n' +
        '<code>First Name, Last Name, DOB, SSN, Email, Phone</code>',
      { parse_mode: 'HTML' },
    ),
  );

  bot.on('text', async (ctx) => {
    const rawText = ctx.message.text;

    // Ignore commands
    if (rawText.startsWith('/')) return;

    let parsed;
    try {
      parsed = parseMessage(rawText);
    } catch (err) {
      return ctx.reply(
        `Invalid format: ${err.message}\n\n` +
          'Please use: <code>First Name, Last Name, DOB, SSN, Email, Phone</code>',
        { parse_mode: 'HTML' },
      );
    }

    const { firstName, lastName, dob, ssn, email, phone } = parsed;

    console.log('Received onboarding submission:');
    console.log(`  First Name : ${firstName}`);
    console.log(`  Last Name  : ${lastName}`);
    console.log(`  DOB        : ${dob}`);
    console.log(`  SSN        : [REDACTED]`);
    console.log(`  Email      : ${email}`);
    console.log(`  Phone      : ${phone}`);

    let recordId;
    try {
      const ssnEnc = encrypt(ssn);
      recordId = await insertRecord({ firstName, lastName, dob, ssnEnc, email, phone });
    } catch (err) {
      console.error('Failed to store record:', err);
      return ctx.reply('Sorry, there was an error saving your information. Please try again later.');
    }

    console.log(`  Stored with record ID: ${recordId}`);

    return ctx.reply(
      `Thank you, ${firstName}! Your information has been received and stored securely (Record ID: ${recordId}).`,
    );
  });

  bot.catch((err, ctx) => {
    console.error(`Telegraf error for update ${ctx.updateType}:`, err);
  });

  return bot;
}

module.exports = { createBot };
