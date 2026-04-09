# cyr-onboarding-agent

Telegram onboarding bot that parses user messages in this format:

`First Name, Last Name, DOB, SSN, Email, Phone`

The bot logs each parsed field to the console and stores the submission in PostgreSQL, encrypting SSN with AES-256 before insertion.

## Tech stack

- [Telegraf](https://telegraf.js.org/) for Telegram bot handling
- [axios](https://axios-http.com/) for HTTP requests
- [dotenv](https://github.com/motdotla/dotenv) for environment variable loading
- [pg](https://node-postgres.com/) for PostgreSQL access

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment file and fill values:

   ```bash
   cp .env.example .env
   ```

3. Start the bot:

   ```bash
   npm start
   ```

## Required environment variables

- `BOT_TOKEN`: Telegram bot token
- `DATABASE_URL`: Railway PostgreSQL connection URL
- `ENCRYPTION_KEY`: Secret key material used to derive the AES-256 key
- `DATABASE_SSL` (optional): Set to `true` for SSL connections
