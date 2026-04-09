require("dotenv").config();

const { initDb } = require("./db");
const { createBot } = require("./bot");

async function main() {
  console.log("[app] Initialising database…");
  await initDb();

  const bot = createBot();

  bot.launch();
  console.log("[app] Bot is running. Press Ctrl+C to stop.");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((err) => {
  console.error("[app] Fatal error:", err);
  process.exit(1);
});
