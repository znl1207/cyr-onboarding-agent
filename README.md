# cyr-onboarding-agent

Node.js onboarding automation agent that starts in Telegram and routes client
data through CreditRepairCloud (CRC), GoHighLevel (GHL), and optional Twilio
SMS confirmations.

## Stack

- Runtime: Node.js
- Hosting: Railway
- Messaging: Telegram Bot API via Telegraf
- Integrations: CRC API + GHL API (axios)
- Database: Railway PostgreSQL (`pg`)
- Encryption: AES-256 (SSN encrypted before DB write)
- Backup automation scaffold: Playwright
- Optional outbound SMS: Twilio

## Current flow implemented

1. Sales rep sends Telegram message:
   - `First Name, Last Name, DOB, SSN, Email, Phone`
2. Bot parses and validates all fields.
3. Parsed data is logged to console (including SSN, per your requirement).
4. SSN is encrypted with AES-256 before storing in PostgreSQL.
5. Bot attempts CRC client creation (if `CRC_API_KEY` is configured).
6. Bot attempts GHL contact creation + onboarding pipeline move (if configured).
7. Bot sends admin review message with submission ID.
8. Admin replies `APPROVE <submissionId>` (or `/approve <submissionId>`).
9. Bot marks submission approved and sends optional Twilio SMS confirmation.

## Project structure

```text
src/
  config.js
  db.js
  encryption.js
  parser.js
  index.js
  services/
    crcService.js
    crcPlaywright.js
    ghlService.js
    twilioService.js
    httpError.js
  workflows/
    onboardingWorkflow.js
```

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local env file:

   ```bash
   cp .env.example .env
   ```

3. Fill required minimum variables:
   - `TELEGRAM_BOT_TOKEN` (or `BOT_TOKEN`)
   - `DATABASE_URL`
   - `ENCRYPTION_KEY`

4. Start the app:

   ```bash
   npm start
   ```

## Operable + testable checklist

Run local smoke checks before connecting live providers:

```bash
npm run smoke-test
```

The smoke test validates:
- message parsing format
- approval command parsing
- SSN encryption output shape

Set an HTTP health port (recommended on Railway):

```bash
PORT=3000
```

Health endpoints:
- `GET /health` -> process + database readiness

Admin troubleshooting:
- Send `/chatid` to the bot to see your current Telegram chat ID.
- If approvals are restricted unexpectedly, compare this value with `ADMIN_CHAT_ID`.
- Approval command formats supported:
  - `APPROVE 123`
  - `/approve 123`
  - `/approve@YourBotUsername 123`

## Important security defaults

- `.env` and `node_modules/` are excluded in `.gitignore`.
- SSN is encrypted before insertion into `onboarding_submissions`.
- DB writes use parameterized SQL queries.

## Environment variables

See `.env.example` for the full list. Key values:

- `TELEGRAM_BOT_TOKEN`: Bot token from BotFather
- `ADMIN_CHAT_ID`: Optional Telegram chat ID allowed to approve
- `DATABASE_URL`: Railway PostgreSQL URL
- `ENCRYPTION_KEY`: key material used to derive AES-256 key
- `CRC_API_KEY`: enables CRC API writes
- `GHL_API_KEY`: enables GHL API writes
- `TWILIO_*`: enables SMS send on approval

## CRC fallback mode

If CRC REST calls fail and `CRC_USE_PLAYWRIGHT_FALLBACK=true`, the app enters
a Playwright scaffold (`src/services/crcPlaywright.js`). Add account-specific
selectors there to complete browser-based fallback submission.

## Database

Table: `onboarding_submissions` (auto-created on startup)

Tracks:

- intake fields (`first_name`, `last_name`, `dob`, `email`, `phone`)
- encrypted SSN (`ssn_encrypted`)
- source Telegram IDs
- CRC/GHL result state and error details
- approval and SMS status lifecycle

## Railway deployment notes

1. Connect this repo to Railway.
2. Add PostgreSQL plugin and copy `DATABASE_URL`.
3. Set all required env vars in Railway service settings.
4. Deploy and verify logs:
   - bot startup
   - DB init
   - Telegram message intake
   - CRC/GHL status updates
