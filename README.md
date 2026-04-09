# cyr-onboarding-agent

Telegram onboarding bot that accepts this message format:

`First Name, Last Name, DOB, SSN, Email, Phone`

It parses each field, logs the values, encrypts SSN using AES-256, and stores
the submission in PostgreSQL (Railway-compatible).

## Tech stack

- [Telegraf](https://telegraf.js.org/) for Telegram bot handling
- [axios](https://axios-http.com/) for Telegram API token verification
- [dotenv](https://github.com/motdotla/dotenv) for environment variables
- [pg](https://node-postgres.com/) for PostgreSQL access

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and set values:

   ```bash
   cp .env.example .env
   ```

3. Start the bot:

   ```bash
   npm start
   ```

## Environment variables

- `BOT_TOKEN`: Telegram bot token from BotFather
- `DATABASE_URL`: Railway PostgreSQL connection string
- `ENCRYPTION_KEY`: Key material used to derive a 256-bit AES key

## Database table

On startup, the app creates this table if it doesn't exist:

- `onboarding_submissions`

with columns:

- `first_name`
- `last_name`
- `dob`
- `ssn_encrypted`
- `email`
- `phone`
- `created_at`
