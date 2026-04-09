const axios = require("axios");
const { getApiErrorMessage } = require("./httpError");

function createGhlService(config) {
  const isEnabled = Boolean(config.apiKey);
  const baseUrl = config.baseUrl.replace(/\/$/, "");

  function getHeaders() {
    return {
      Authorization: `Bearer ${config.apiKey}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
    };
  }

  async function createOnboardingContact(clientData) {
    if (!isEnabled) {
      return {
        status: "skipped",
        error: "GHL integration skipped because GHL_API_KEY is not set.",
      };
    }

    try {
      const contactResponse = await axios.post(
        `${baseUrl}${config.contactPath}`,
        {
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          email: clientData.email,
          phone: clientData.phone,
          locationId: config.locationId,
        },
        {
          timeout: 15000,
          headers: getHeaders(),
        },
      );

      const contactData = contactResponse.data || {};
      const contactId =
        contactData.contact?.id ||
        contactData.id ||
        contactData.data?.id ||
        null;

      if (!contactId) {
        return {
          status: "failed",
          error: "GHL contact created but contact ID was not returned.",
        };
      }

      if (!config.pipelineId || !config.onboardingStageId) {
        return {
          status: "success",
          contactId: String(contactId),
          error:
            "Contact created, but pipeline move skipped (set GHL_PIPELINE_ID and GHL_ONBOARDING_STAGE_ID).",
        };
      }

      await axios.post(
        `${baseUrl}${config.opportunityPath}`,
        {
          locationId: config.locationId,
          contactId,
          pipelineId: config.pipelineId,
          pipelineStageId: config.onboardingStageId,
          name: `${clientData.firstName} ${clientData.lastName} Onboarding`,
          status: "open",
        },
        {
          timeout: 15000,
          headers: getHeaders(),
        },
      );

      return {
        status: "success",
        contactId: String(contactId),
      };
    } catch (error) {
      return {
        status: "failed",
        error: getApiErrorMessage(error),
      };
    }
  }

  return { createOnboardingContact, isEnabled };
}

module.exports = { createGhlService };
