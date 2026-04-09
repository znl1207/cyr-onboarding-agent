# cyr-onboarding-agent

Telegram onboarding bot built with Telegraf, axios, dotenv, and pg.

## Features

- Accepts Telegram messages in this format: `First Name, Last Name, DOB, SSN, Email, Phone`
- Parses each field and logs the parsed submission to the console
- Encrypts the SSN with AES-256-GCM before writing to PostgreSQL
- Stores onboarding submissions in a PostgreSQL table created automatically at startup
- Works with Railway PostgreSQL via `DATABASE_URL`

## Project structure

```text
.
├── src
│   ├── bot.js
│   ├── config.js
│   ├── crypto.js
│   ├── db.js
│   ├── index.js
│   └── parser.js
├── .env.example
├── .gitignore
└── package.json
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env
   ```

3. Set these environment variables in `.env`:

   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   DATABASE_URL=postgresql://username:password@hostname:5432/database_name
   ENCRYPTION_KEY=replace_with_a_long_random_secret
   ```

4. Start the bot:

   ```bash
   npm start
   ```

## Usage

Send a message to the bot in this exact comma-separated format:

```text
Jane, Doe, 1990-05-20, 123-45-6789, jane.doe@example.com, +1 555-123-4567
```

On each valid message, the bot will:

1. Parse the six fields
2. Log the parsed values to the console
3. Encrypt the SSN
4. Insert the record into PostgreSQL

## Notes

- The SSN is encrypted before storage, but it is still logged to the console because that behavior was explicitly requested.
- Railway PostgreSQL deployments typically require SSL; the app enables SSL automatically for non-local PostgreSQL hosts.
