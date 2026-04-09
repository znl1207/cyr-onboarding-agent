const { createBot, validateBotToken } = require('./bot');
const { loadConfig } = require('./config');
const { createDatabase } = require('./db');

async function main() {
  const config = loadConfig();
  const database = createDatabase({ connectionString: config.databaseUrl });

  await database.initialize();

  const botIdentity = await validateBotToken(config.botToken);
  console.log(
    `Telegram bot verified as ${botIdentity.username ? `@${botIdentity.username}` : botIdentity.first_name}.`
  );

  const bot = createBot({
    botToken: config.botToken,
    database,
    encryptionKey: config.encryptionKey,
  });

  await bot.launch();
  console.log('cyr-onboarding-agent is running.');

  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    bot.stop(signal);
    await database.close();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

main().catch((error) => {
  console.error('Failed to start cyr-onboarding-agent:', error);
  process.exit(1);
});
