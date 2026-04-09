const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS onboarding_records (
      id          SERIAL PRIMARY KEY,
      first_name  VARCHAR(100)  NOT NULL,
      last_name   VARCHAR(100)  NOT NULL,
      dob         DATE          NOT NULL,
      ssn_enc     TEXT          NOT NULL,
      email       VARCHAR(255)  NOT NULL,
      phone       VARCHAR(50)   NOT NULL,
      created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )
  `);
}

async function insertRecord({ firstName, lastName, dob, ssnEnc, email, phone }) {
  const result = await pool.query(
    `INSERT INTO onboarding_records
       (first_name, last_name, dob, ssn_enc, email, phone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [firstName, lastName, dob, ssnEnc, email, phone],
  );
  return result.rows[0].id;
}

module.exports = { initDb, insertRecord };
