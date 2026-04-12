const axios = require("axios");
const { getApiErrorMessage } = require("./httpError");

function createZapierService(config) {
  const isEnabled = Boolean(config.webhookUrl);

  async function sendOnboardingPayload(clientData, metadata = {}) {
    if (!isEnabled) {
      return {
        status: "skipped",
        error: "Zapier integration skipped because ZAPIER_WEBHOOK_URL is not set.",
      };
    }

    const payload = {
      source: "cyr-onboarding-agent",
      timestamp: new Date().toISOString(),
      firstName: clientData.firstName,
      lastName: clientData.lastName,
      dob: clientData.dob,
      ssn: clientData.ssn,
      email: clientData.email,
      phone: clientData.phone,
      submissionId: metadata.submissionId || null,
      sourceChatId: metadata.sourceChatId || null,
      sourceUserId: metadata.sourceUserId || null,
    };

    try {
      const response = await axios.post(config.webhookUrl, payload, {
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
        },
      });

      return {
        status: "success",
        requestId: response.headers["x-zapier-request-id"] || null,
      };
    } catch (error) {
      return {
        status: "failed",
        error: getApiErrorMessage(error),
      };
    }
  }

  return { isEnabled, sendOnboardingPayload };
}

module.exports = { createZapierService };
