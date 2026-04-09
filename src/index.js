const { createBot } = require("./bot");
const { initializeDatabase, closeDatabase } = require("./db/client");

async function start() {
  await initializeDatabase();

  const bot = createBot();
  await bot.launch();

  console.log("cyr-onboarding-agent bot is running.");

  async function shutdown(signal) {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    bot.stop(signal);
    await closeDatabase();
    process.exit(0);
  }

  process.once("SIGINT", () => {
    shutdown("SIGINT").catch((error) => {
      console.error("Shutdown error:", error);
      process.exit(1);
    });
  });

  process.once("SIGTERM", () => {
    shutdown("SIGTERM").catch((error) => {
      console.error("Shutdown error:", error);
      process.exit(1);
    });
  });
}

start().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});
