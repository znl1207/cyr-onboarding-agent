const { chromium } = require("playwright");

async function createCRCClientViaPlaywright(clientData, config) {
  if (!config.playwrightLoginUrl) {
    throw new Error(
      "CRC Playwright fallback is enabled, but CRC_PLAYWRIGHT_LOGIN_URL is missing.",
    );
  }

  if (!config.playwrightUsername || !config.playwrightPassword) {
    throw new Error(
      "CRC Playwright fallback requires CRC_PLAYWRIGHT_USERNAME and CRC_PLAYWRIGHT_PASSWORD.",
    );
  }

  const browser = await chromium.launch({ headless: config.playwrightHeadless });
  const page = await browser.newPage();

  try {
    await page.goto(config.playwrightLoginUrl, { waitUntil: "networkidle" });

    // This is intentionally a scaffold so selectors can be customized safely
    // for CRC account variations without changing core bot logic.
    throw new Error(
      "Playwright fallback scaffold reached. Add account-specific selectors in src/services/crcPlaywright.js to automate CRC form submission.",
    );
  } finally {
    await page.close();
    await browser.close();
  }
}

module.exports = { createCRCClientViaPlaywright };
