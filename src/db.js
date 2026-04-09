const { Pool } = require('pg');

function shouldUseSsl(connectionString) {
  try {
    const hostname = new URL(connectionString).hostname;
    return hostname !== 'localhost' && hostname !== '127.0.0.1';
  } catch (error) {
    return true;
  }
}

function createDatabase({ connectionString }) {
  const pool = new Pool({
    connectionString,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false,
  });

  async function initialize() {
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

  async function saveSubmission({ firstName, lastName, dob, encryptedSsn, email, phone }) {
    const result = await pool.query(
      `
        INSERT INTO onboarding_submissions (
          first_name,
          last_name,
          dob,
          encrypted_ssn,
          email,
          phone
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at;
      `,
      [firstName, lastName, dob, encryptedSsn, email, phone]
    );

    return result.rows[0];
  }

  async function close() {
    await pool.end();
  }

  return {
    initialize,
    saveSubmission,
    close,
  };
}

module.exports = {
  createDatabase,
};
