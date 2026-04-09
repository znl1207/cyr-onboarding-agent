const { pool } = require('../config/database');

async function saveSubmission(submission) {
  const insertQuery = `
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
  `;

  const values = [
    submission.firstName,
    submission.lastName,
    submission.dob,
    submission.encryptedSsn,
    submission.email,
    submission.phone,
  ];

  const { rows } = await pool.query(insertQuery, values);
  return rows[0];
}

module.exports = {
  saveSubmission,
};
