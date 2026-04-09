const { Pool } = require('pg');
const { databaseUrl } = require('./env');

function shouldUseSsl(connectionString) {
  try {
    const parsedUrl = new URL(connectionString);
    return !['localhost', '127.0.0.1'].includes(parsedUrl.hostname);
  } catch (error) {
    return true;
  }
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : false,
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS onboarding_submissions (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      dob TEXT NOT NULL,
      encrypted_ssn TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

module.exports = {
  pool,
  initializeDatabase,
};
