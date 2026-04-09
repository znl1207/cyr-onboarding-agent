const { telegramBotToken, databaseUrl, encryptionKey } = require('./config');
const { createBot, logBotProfile } = require('./services/bot');
const { createPool, initializeDatabase } = require('./services/database');

async function bootstrap() {
  const pool = createPool(databaseUrl);

  await initializeDatabase(pool);
  await logBotProfile(telegramBotToken);

  const bot = createBot({
    telegramBotToken,
    encryptionKey,
    pool,
  });

  await bot.launch();

  console.log('cyr-onboarding-agent is running.');

  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully.`);
    await bot.stop(signal);
    await pool.end();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    shutdown('SIGINT').catch((error) => {
      console.error('Graceful shutdown failed:', error);
      process.exit(1);
    });
  });

  process.once('SIGTERM', () => {
    shutdown('SIGTERM').catch((error) => {
      console.error('Graceful shutdown failed:', error);
      process.exit(1);
    });
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start cyr-onboarding-agent:', error);
  process.exit(1);
});
