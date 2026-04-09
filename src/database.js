const { Pool } = require("pg");
const { databaseUrl, dbSslEnabled } = require("./config");

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: dbSslEnabled ? { rejectUnauthorized: false } : false,
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

async function saveSubmission(submission) {
  const query = `
    INSERT INTO onboarding_submissions
      (first_name, last_name, dob, encrypted_ssn, email, phone)
    VALUES
      ($1, $2, $3, $4, $5, $6)
    RETURNING id;
  `;

  const values = [
    submission.firstName,
    submission.lastName,
    submission.dob,
    submission.encryptedSsn,
    submission.email,
    submission.phone,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

module.exports = {
  pool,
  initializeDatabase,
  saveSubmission,
};
