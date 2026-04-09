require('dotenv').config();

const { initDb } = require('./db');
const { createBot } = require('./bot');

async function main() {
  console.log('Initializing database...');
  await initDb();
  console.log('Database ready.');

  const bot = createBot();

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  console.log('Starting CYR Onboarding Agent bot...');
  await bot.launch();
  console.log('Bot is running. Waiting for messages...');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
