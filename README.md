# cyr-onboarding-agent

Node.js onboarding automation agent that starts in Telegram and routes client
data through CreditRepairCloud (CRC), optional Zapier, and operational
fulfillment handoff automation.

## Stack

- Runtime: Node.js
- Hosting: Railway
- Messaging: Telegram Bot API via Telegraf
- Integrations: CRC API + Zapier webhook + Google Sheets (axios/googleapis)
- Database: Railway PostgreSQL (`pg`)
- Encryption: AES-256 (SSN encrypted before DB write)
- Backup automation scaffold: Playwright

## Current flow implemented

1. Sales rep sends Telegram message:
   - `First Name, Last Name, DOB, SSN, Email, Phone`
2. Bot parses and validates all fields.
3. Parsed data is logged to console (including SSN, per your requirement).
4. SSN is encrypted with AES-256 before storing in PostgreSQL.
5. Bot attempts client creation via Zapier webhook first (if configured), then falls back to direct CRC API.
6. Direct CRC API mode (optional) uses your onboarding defaults:
   - status: `Client`
   - referred by: `CRC_REFERRED_BY_FIRST_NAME` + `CRC_REFERRED_BY_LAST_NAME`
   - portal access: enabled by default when email is present
7. Bot attempts GHL contact creation + onboarding pipeline move (if configured).
8. Bot sends admin review message with submission ID.
9. Admin replies `APPROVE <submissionId>` (or `/approve <submissionId>`).
10. When documents are received, admin replies `DOCS_RECEIVED <submissionId>`.
11. Bot appends the client into the fulfillment Google Sheet and confirms in Telegram.
11. When docs are confirmed, admin replies `DOCS_RECEIVED <submissionId>` to append a fulfillment row to Google Sheets and mark onboarding complete.

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
    zapierService.js
    googleSheetsService.js
    crcPlaywright.js
    ghlService.js
    googleSheetsService.js
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
  - `DOCS_RECEIVED 123`

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
- `CRC_API_KEY`: enables CRC API writes (legacy API auth key)
- `ZAPIER_WEBHOOK_URL`: if set, bot posts intake payload to Zapier for downstream automation (recommended path)
- `CRC_SECRET_KEY`: legacy CRC secret key (required for XML API mode)
- `CRC_CLIENT_STATUS`: default onboarding status (`Client`)
- `CRC_REFERRED_BY_FIRST_NAME` / `CRC_REFERRED_BY_LAST_NAME`: referral defaults
- `CRC_CLIENT_AGREEMENT`: optional agreement name when portal access is enabled
- `CRC_PORTAL_ACCESS_ENABLED`: turn client portal access on/off
- `CRC_SEND_PORTAL_PASSWORD_EMAIL`: whether CRC emails portal setup info
- `GHL_API_KEY`: enables GHL API writes
- `GOOGLE_SHEET_ID`: target fulfillment sheet id
- `GOOGLE_SHEET_NAME`: target worksheet/tab name (default `Fulfillment`)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Google service account client email
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: service account private key (with `\n` escaped)
- `GOOGLE_SHEET_ID`: target fulfillment sheet ID
- `GOOGLE_SHEET_NAME`: tab name in the Google Sheet (default `Sheet1`)
- `GOOGLE_SERVICE_ACCOUNT_JSON` or (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`): credentials for Sheets append

## CRC fallback mode

If CRC REST calls fail and `CRC_USE_PLAYWRIGHT_FALLBACK=true`, the app enters
a Playwright scaffold (`src/services/crcPlaywright.js`). Add account-specific
selectors there to complete browser-based fallback submission.

## CRC API mode notes

The service supports two CRC request modes:

- `legacy_xml` (default): uses `apiauthkey` + `secretkey` + `xmlData` form posts
  to CRC legacy endpoints (`/api/lead/insertRecord`).
- `json`: uses Bearer/X-API-KEY JSON posting (for custom/proxy APIs only).

For standard Credit Repair Cloud credentials from the CRC dashboard, use:

- `CRC_MODE=legacy_xml`
- `CRC_BASE_URL=https://app.creditrepaircloud.com`
- `CRC_CREATE_CLIENT_PATH=/api/lead/insertRecord`
- `CRC_API_KEY=<your apiauthkey>`
- `CRC_SECRET_KEY=<your secretkey>`
- `CRC_CLIENT_STATUS=Client`
- `CRC_STATUS_CANDIDATES=Client,Lead,Lead/Client,Active,Pending`
- `CRC_REFERRED_BY_FIRST_NAME=Zayn`
- `CRC_REFERRED_BY_LAST_NAME=Lakhani`
- `CRC_CLIENT_AGREEMENT=<exact agreement name in CRC, if required>`
- `CRC_PORTAL_ACCESS_ENABLED=true`
- `CRC_SEND_PORTAL_PASSWORD_EMAIL=true`

If CRC returns failures while portal access is enabled, troubleshoot in this order:
1. Set `CRC_PORTAL_ACCESS_ENABLED=false` and retest to verify base client creation.
2. Re-enable portal access and set `CRC_CLIENT_AGREEMENT` to the exact agreement
   label from CRC (My Company -> Agreement).

## Zapier-first mode (recommended to avoid CRC XML friction)

If `ZAPIER_WEBHOOK_URL` is set, the bot sends parsed intake data to Zapier and treats that as the primary "CRC create" path.

Webhook payload fields:
- `submissionId`
- `firstName`
- `lastName`
- `dob`
- `ssn`
- `email`
- `phone`
- `sourceChatId`
- `sourceUserId`
- `receivedAt`

Suggested Zap:
1. Trigger: Webhooks by Zapier -> Catch Hook
2. Action: Credit Repair Cloud -> Create Lead/Client
3. (Optional) Action: Additional notifications

## Fulfillment handoff to Google Sheets

Once docs are received, send:

`DOCS_RECEIVED <submissionId>`

The bot will:
- mark docs received in PostgreSQL
- append a row to your configured Google Sheet tab
- send a Telegram confirmation that onboarding is complete

## Database

Table: `onboarding_submissions` (auto-created on startup)

Tracks:

- intake fields (`first_name`, `last_name`, `dob`, `email`, `phone`)
- encrypted SSN (`ssn_encrypted`)
- source Telegram IDs
- CRC/GHL result state and error details
- approval, docs-received, and fulfillment-sync lifecycle

## Railway deployment notes

1. Connect this repo to Railway.
2. Add PostgreSQL plugin and copy `DATABASE_URL`.
3. Set all required env vars in Railway service settings.
4. Deploy and verify logs:
   - bot startup
   - DB init
   - Telegram message intake
   - CRC/GHL status updates
