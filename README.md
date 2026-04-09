# cyr-onboarding-agent

Telegram onboarding bot built with Node.js, Telegraf, axios, dotenv, and PostgreSQL.

## Features

- Accepts messages in the format:
  `First Name, Last Name, DOB, SSN, Email, Phone`
- Parses and logs each field to the console
- Encrypts SSNs with AES-256 before storing them
- Persists submissions to PostgreSQL, including Railway-hosted databases

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set the required values:

   ```env
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   DATABASE_URL=postgresql://postgres:password@host:5432/database
   ENCRYPTION_KEY=your-secret
   ```

3. Start the bot:

   ```bash
   npm start
   ```

## Database

On startup, the app creates an `onboarding_submissions` table if it does not already exist.
