# cyr-onboarding-agent

Telegram bot that collects onboarding information, encrypts sensitive fields (SSN), and stores everything in a Railway PostgreSQL database.

## Message Format

Send the bot a message with six comma-separated fields:

```
First Name, Last Name, DOB, SSN, Email, Phone
```

Example:

```
Jane, Doe, 01/15/1990, 123-45-6789, jane@example.com, 555-123-4567
```

## Setup

1. **Clone and install**

```bash
cd cyr-onboarding-agent
npm install
```

2. **Configure environment** — copy the example and fill in your values:

```bash
cp .env.example .env
```

| Variable         | Description                                        |
| ---------------- | -------------------------------------------------- |
| `BOT_TOKEN`      | Telegram bot token from [@BotFather](https://t.me/BotFather) |
| `DATABASE_URL`   | PostgreSQL connection string (Railway provides this) |
| `ENCRYPTION_KEY` | 64-character hex string (32 bytes for AES-256)     |

Generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. **Run**

```bash
npm start
```

## Project Structure

```
cyr-onboarding-agent/
├── src/
│   ├── index.js    # Entry point — boots DB and starts bot
│   ├── bot.js      # Telegraf bot — parses messages, orchestrates flow
│   ├── crypto.js   # AES-256-CBC encrypt / decrypt helpers
│   └── db.js       # PostgreSQL pool, schema init, insert query
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Database Schema

The bot auto-creates the `onboarding_users` table on startup:

| Column          | Type           | Notes                  |
| --------------- | -------------- | ---------------------- |
| `id`            | `SERIAL`       | Primary key            |
| `first_name`    | `VARCHAR(100)` |                        |
| `last_name`     | `VARCHAR(100)` |                        |
| `dob`           | `VARCHAR(20)`  |                        |
| `ssn_encrypted` | `TEXT`          | AES-256-CBC ciphertext |
| `email`         | `VARCHAR(255)` |                        |
| `phone`         | `VARCHAR(30)`  |                        |
| `created_at`    | `TIMESTAMPTZ`  | Defaults to `NOW()`   |

## Tech Stack

- [Telegraf](https://telegraf.js.org/) — Telegram bot framework
- [pg](https://node-postgres.com/) — PostgreSQL client
- [axios](https://axios-http.com/) — HTTP client
- [dotenv](https://github.com/motdotla/dotenv) — Environment variable loader
- Node.js built-in `crypto` — AES-256-CBC encryption
