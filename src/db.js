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
        source_chat_id BIGINT NOT NULL DEFAULT 0,
        source_user_id BIGINT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        dob DATE NOT NULL,
        ssn_encrypted TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        crc_client_id TEXT,
        crc_status TEXT NOT NULL DEFAULT 'pending',
        crc_error TEXT,
        ghl_contact_id TEXT,
        ghl_status TEXT NOT NULL DEFAULT 'pending',
        ghl_error TEXT,
        approval_status TEXT NOT NULL DEFAULT 'pending',
        approval_requested_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        approval_admin_chat_id BIGINT,
        approval_admin_user_id BIGINT,
        sms_status TEXT NOT NULL DEFAULT 'not_requested',
        sms_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      ALTER TABLE onboarding_submissions
      ADD COLUMN IF NOT EXISTS source_chat_id BIGINT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS source_user_id BIGINT,
      ADD COLUMN IF NOT EXISTS crc_client_id TEXT,
      ADD COLUMN IF NOT EXISTS crc_status TEXT NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS crc_error TEXT,
      ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT,
      ADD COLUMN IF NOT EXISTS ghl_status TEXT NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS ghl_error TEXT,
      ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS approval_admin_chat_id BIGINT,
      ADD COLUMN IF NOT EXISTS approval_admin_user_id BIGINT,
      ADD COLUMN IF NOT EXISTS sms_status TEXT NOT NULL DEFAULT 'not_requested',
      ADD COLUMN IF NOT EXISTS sms_error TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_approval_status
        ON onboarding_submissions (approval_status, created_at DESC);
    `);
  }

  async function createSubmission(submission) {
    const result = await pool.query(
      `
        INSERT INTO onboarding_submissions (
          source_chat_id,
          source_user_id,
          first_name,
          last_name,
          dob,
          ssn_encrypted,
          email,
          phone
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `,
      [
        submission.sourceChatId,
        submission.sourceUserId || null,
        submission.firstName,
        submission.lastName,
        submission.dob,
        submission.encryptedSsn,
        submission.email,
        submission.phone,
      ],
    );

    return mapSubmission(result.rows[0]);
  }

  async function updateCrcResult(submissionId, crcResult) {
    await pool.query(
      `
        UPDATE onboarding_submissions
        SET
          crc_client_id = $2,
          crc_status = $3,
          crc_error = $4,
          updated_at = NOW()
        WHERE id = $1;
      `,
      [
        submissionId,
        crcResult.clientId || null,
        crcResult.status,
        crcResult.error || null,
      ],
    );
  }

  async function updateGhlResult(submissionId, ghlResult) {
    await pool.query(
      `
        UPDATE onboarding_submissions
        SET
          ghl_contact_id = $2,
          ghl_status = $3,
          ghl_error = $4,
          updated_at = NOW()
        WHERE id = $1;
      `,
      [
        submissionId,
        ghlResult.contactId || null,
        ghlResult.status,
        ghlResult.error || null,
      ],
    );
  }

  async function markApprovalRequested(submissionId) {
    await pool.query(
      `
        UPDATE onboarding_submissions
        SET
          approval_requested_at = NOW(),
          updated_at = NOW()
        WHERE id = $1;
      `,
      [submissionId],
    );
  }

  async function markApproved(submissionId, metadata) {
    await pool.query(
      `
        UPDATE onboarding_submissions
        SET
          approval_status = 'approved',
          approved_at = NOW(),
          approval_admin_chat_id = $2,
          approval_admin_user_id = $3,
          updated_at = NOW()
        WHERE id = $1;
      `,
      [submissionId, metadata.adminChatId, metadata.adminUserId || null],
    );
  }

  async function updateSmsResult(submissionId, smsResult) {
    await pool.query(
      `
        UPDATE onboarding_submissions
        SET
          sms_status = $2,
          sms_error = $3,
          updated_at = NOW()
        WHERE id = $1;
      `,
      [submissionId, smsResult.status, smsResult.error || null],
    );
  }

  async function getSubmissionById(submissionId) {
    const result = await pool.query(
      `
        SELECT *
        FROM onboarding_submissions
        WHERE id = $1
        LIMIT 1;
      `,
      [submissionId],
    );

    return result.rows[0] ? mapSubmission(result.rows[0]) : null;
  }

  async function getLatestPendingSubmission() {
    const result = await pool.query(`
      SELECT *
      FROM onboarding_submissions
      WHERE approval_status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1;
    `);

    return result.rows[0] ? mapSubmission(result.rows[0]) : null;
  }

  async function close() {
    await pool.end();
  }

  return {
    init,
    createSubmission,
    updateCrcResult,
    updateGhlResult,
    markApprovalRequested,
    markApproved,
    updateSmsResult,
    getSubmissionById,
    getLatestPendingSubmission,
    close,
  };
}

function mapSubmission(row) {
  return {
    id: row.id,
    sourceChatId: row.source_chat_id,
    sourceUserId: row.source_user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    dob: row.dob,
    encryptedSsn: row.ssn_encrypted,
    email: row.email,
    phone: row.phone,
    crcClientId: row.crc_client_id,
    crcStatus: row.crc_status,
    crcError: row.crc_error,
    ghlContactId: row.ghl_contact_id,
    ghlStatus: row.ghl_status,
    ghlError: row.ghl_error,
    approvalStatus: row.approval_status,
    approvalRequestedAt: row.approval_requested_at,
    approvedAt: row.approved_at,
    approvalAdminChatId: row.approval_admin_chat_id,
    approvalAdminUserId: row.approval_admin_user_id,
    smsStatus: row.sms_status,
    smsError: row.sms_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = { createDatabaseClient };
