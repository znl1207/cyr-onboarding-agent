# cyr-onboarding-agent

A Node.js Telegram bot that accepts onboarding messages, encrypts SSNs with AES-256, and stores submissions in PostgreSQL (Railway-compatible).

## Requirements

- Node.js 18+
- A Telegram bot token (`BOT_TOKEN`)
- PostgreSQL connection string (`DATABASE_URL`)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your credentials:

   - `BOT_TOKEN`
   - `DATABASE_URL`
   - `ENCRYPTION_KEY`
   - `DATABASE_SSL` (optional)

4. Start the bot:

   ```bash
   npm start
   ```

## Message Format

Send messages to the bot using:

`First Name, Last Name, DOB, SSN, Email, Phone`

Example:

`Jane, Doe, 1993-07-14, 123-45-6789, jane@example.com, +15551234567`

Each valid submission is:

- Parsed into its six fields
- Logged to the console
- Stored in `onboarding_submissions` in PostgreSQL with `SSN` encrypted before insert
