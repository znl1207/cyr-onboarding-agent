const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_users (
        id            SERIAL PRIMARY KEY,
        first_name    VARCHAR(100)  NOT NULL,
        last_name     VARCHAR(100)  NOT NULL,
        dob           VARCHAR(20)   NOT NULL,
        ssn_encrypted TEXT          NOT NULL,
        email         VARCHAR(255)  NOT NULL,
        phone         VARCHAR(30)   NOT NULL,
        created_at    TIMESTAMPTZ   DEFAULT NOW()
      );
    `);
    console.log("[db] onboarding_users table ready");
  } finally {
    client.release();
  }
}

async function insertUser({ firstName, lastName, dob, ssnEncrypted, email, phone }) {
  const result = await pool.query(
    `INSERT INTO onboarding_users
       (first_name, last_name, dob, ssn_encrypted, email, phone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [firstName, lastName, dob, ssnEncrypted, email, phone]
  );
  return result.rows[0].id;
}

module.exports = { pool, initDb, insertUser };
