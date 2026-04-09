const { Pool } = require("pg");

const LOCAL_CONNECTION_PATTERN = /(localhost|127\.0\.0\.1)/i;

function createPool(databaseUrl) {
  const useSsl = !LOCAL_CONNECTION_PATTERN.test(databaseUrl);

  return new Pool({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
}

function createDatabaseClient(databaseUrl) {
  const pool = createPool(databaseUrl);

  async function init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS onboarding_submissions (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        dob DATE NOT NULL,
        ssn_encrypted TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  async function insertSubmission(applicant) {
    await pool.query(
      `
        INSERT INTO onboarding_submissions (
          first_name,
          last_name,
          dob,
          ssn_encrypted,
          email,
          phone
        )
        VALUES ($1, $2, $3, $4, $5, $6);
      `,
      [
        applicant.firstName,
        applicant.lastName,
        applicant.dob,
        applicant.encryptedSsn,
        applicant.email,
        applicant.phone,
      ],
    );
  }

  async function close() {
    await pool.end();
  }

  return { init, insertSubmission, close };
}

module.exports = { createDatabaseClient };
