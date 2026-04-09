const { pool } = require("../db/client");
const { encryptSSN } = require("./encryption");

async function saveSubmission(submission) {
  const encryptedSsn = encryptSSN(submission.ssn);

  const insertQuery = `
    INSERT INTO onboarding_submissions (
      first_name,
      last_name,
      dob,
      ssn_encrypted,
      email,
      phone
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id;
  `;

  const values = [
    submission.firstName,
    submission.lastName,
    submission.dob,
    encryptedSsn,
    submission.email,
    submission.phone,
  ];

  const result = await pool.query(insertQuery, values);
  return result.rows[0].id;
}

module.exports = {
  saveSubmission,
};
