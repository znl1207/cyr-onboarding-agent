# cyr-onboarding-agent

Telegram onboarding bot built with Telegraf, axios, dotenv, and pg.

## Features

- Accepts Telegram messages in this format:
  `First Name, Last Name, DOB, SSN, Email, Phone`
- Parses and logs each field to the server console
- Encrypts SSNs with AES-256 before saving
- Persists submissions to PostgreSQL, including Railway PostgreSQL
- Creates the required database table automatically on startup

## Project structure

```text
src/
  config/
    database.js
    env.js
  services/
    submissions.js
    telegramApi.js
  utils/
    encryption.js
    parser.js
  bot.js
  index.js
```

## Environment variables

Copy `.env.example` to `.env` and provide values for:

- `BOT_TOKEN` - Telegram bot token from BotFather
- `DATABASE_URL` - PostgreSQL connection string
- `ENCRYPTION_KEY` - secret used to derive the AES-256 encryption key

## Install

```bash
npm install
```

## Run

```bash
npm start
```

## Expected message format

Send onboarding data to the bot as:

```text
First Name, Last Name, DOB, SSN, Email, Phone
```

Example:

```text
Jane, Doe, 1990-05-10, 123-45-6789, jane@example.com, +1-555-111-2222
```
