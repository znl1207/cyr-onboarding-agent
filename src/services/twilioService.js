const twilio = require("twilio");

function createTwilioService(config) {
  const isEnabled = Boolean(
    config.accountSid && config.authToken && config.fromNumber,
  );

  const client = isEnabled
    ? twilio(config.accountSid, config.authToken)
    : null;

  async function sendApprovalSms(toPhoneNumber, firstName) {
    if (!isEnabled) {
      return {
        status: "skipped",
        error:
          "SMS skipped because Twilio credentials are not fully configured.",
      };
    }

    const body = config.approvalMessageTemplate.replace(
      /\[First Name\]/gi,
      firstName || "there",
    );

    try {
      await client.messages.create({
        to: toPhoneNumber,
        from: config.fromNumber,
        body,
      });

      return { status: "sent" };
    } catch (error) {
      return {
        status: "failed",
        error: error.message,
      };
    }
  }

  return { sendApprovalSms, isEnabled };
}

module.exports = { createTwilioService };
