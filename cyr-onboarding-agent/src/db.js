const { Pool } = require('pg');

/**
 * @param {string} databaseUrl
 * @returns {import('pg').Pool}
 */
function createPool(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  return new Pool({
    connectionString: databaseUrl,
    ssl:
      process.env.PGSSLMODE === 'disable'
        ? false
        : { rejectUnauthorized: false },
  });
}

/**
 * @param {import('pg').Pool} pool
 */
async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS onboarding_submissions (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      dob TEXT NOT NULL,
      ssn_encrypted TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * @param {import('pg').Pool} pool
 * @param {object} row
 * @param {string} row.firstName
 * @param {string} row.lastName
 * @param {string} row.dob
 * @param {string} row.ssnEncrypted
 * @param {string} row.email
 * @param {string} row.phone
 */
async function insertSubmission(pool, row) {
  const result = await pool.query(
    `INSERT INTO onboarding_submissions
      (first_name, last_name, dob, ssn_encrypted, email, phone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at`,
    [
      row.firstName,
      row.lastName,
      row.dob,
      row.ssnEncrypted,
      row.email,
      row.phone,
    ]
  );
  return result.rows[0];
}

module.exports = { createPool, ensureSchema, insertSubmission };
