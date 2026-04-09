# cyr-onboarding-agent

A Telegram bot that collects user onboarding data and stores it securely in a Railway PostgreSQL database. SSN fields are encrypted with AES-256-CBC before storage.

## Message Format

Send a single message to the bot with **six comma-separated fields**:

```
First Name, Last Name, DOB, SSN, Email, Phone
```

Example:

```
Jane, Doe, 01/15/1990, 123-45-6789, jane@example.com, 555-123-4567
```

## Project Structure

```
cyr-onboarding-agent/
├── src/
│   ├── index.js    # Entry point
│   ├── bot.js      # Telegraf bot setup & message handler
│   ├── crypto.js   # AES-256-CBC encrypt / decrypt helpers
│   └── db.js       # PostgreSQL pool, table init & insert
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Setup

1. **Clone the repo** and install dependencies:

   ```bash
   cd cyr-onboarding-agent
   npm install
   ```

2. **Create a `.env`** file (copy from the example):

   ```bash
   cp .env.example .env
   ```

3. **Fill in the environment variables**:

   | Variable         | Description                                             |
   | ---------------- | ------------------------------------------------------- |
   | `BOT_TOKEN`      | Telegram bot token from [@BotFather](https://t.me/BotFather) |
   | `DATABASE_URL`   | PostgreSQL connection string (e.g. from Railway)        |
   | `ENCRYPTION_KEY` | 64-character hex string (32 bytes) for AES-256          |

   Generate a random encryption key:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Run the bot**:

   ```bash
   npm start
   ```

## Development

```bash
npm run dev   # uses --watch for auto-restart on file changes
```

## Tech Stack

- **Telegraf** — Telegram Bot framework
- **pg** — PostgreSQL client
- **axios** — HTTP client (available for future integrations)
- **dotenv** — environment variable loader
- **crypto** (built-in) — AES-256-CBC encryption
