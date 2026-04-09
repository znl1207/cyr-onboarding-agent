const { botToken } = require('./config/env');
const { pool, initializeDatabase } = require('./config/database');
const { createBot } = require('./bot');
const { fetchBotProfile } = require('./services/telegramApi');

function registerShutdownHandlers(bot) {
  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    bot.stop(signal);
    await pool.end();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    shutdown('SIGINT').catch((error) => {
      console.error('Failed to shut down cleanly:', error);
      process.exit(1);
    });
  });

  process.once('SIGTERM', () => {
    shutdown('SIGTERM').catch((error) => {
      console.error('Failed to shut down cleanly:', error);
      process.exit(1);
    });
  });
}

async function startApplication() {
  await initializeDatabase();
  console.log('Database connection established and schema is ready.');

  const profile = await fetchBotProfile(botToken);
  const botName = profile.username ? `@${profile.username}` : profile.first_name;
  console.log(`Connected to Telegram as ${botName}.`);

  const bot = createBot();
  await bot.launch();
  console.log('Bot is listening for onboarding submissions.');

  registerShutdownHandlers(bot);
  return bot;
}

if (require.main === module) {
  startApplication().catch((error) => {
    console.error('Application failed to start:', error);
    process.exit(1);
  });
}

module.exports = {
  startApplication,
};
