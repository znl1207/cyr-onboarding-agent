const axios = require("axios");
const { createCRCClientViaPlaywright } = require("./crcPlaywright");
const { getApiErrorMessage } = require("./httpError");

function createCrcService(config) {
  const isEnabled = Boolean(config.apiKey);

  async function createClient(clientData) {
    if (!isEnabled) {
      return {
        status: "skipped",
        error: "CRC integration skipped because CRC_API_KEY is not set.",
      };
    }

    const url = `${config.baseUrl.replace(/\/$/, "")}${config.createClientPath}`;
    const payload = {
      firstName: clientData.firstName,
      lastName: clientData.lastName,
      dob: clientData.dob,
      ssn: clientData.ssn,
      email: clientData.email,
      phone: clientData.phone,
    };

    try {
      const response = await axios.post(url, payload, {
        timeout: 15000,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "x-api-key": config.apiKey,
          "Content-Type": "application/json",
        },
      });

      const responseData = response.data || {};
      const clientId =
        responseData.id ||
        responseData.clientId ||
        responseData.data?.id ||
        responseData.data?.clientId;

      return {
        status: "success",
        clientId: clientId ? String(clientId) : null,
      };
    } catch (error) {
      const apiError = getApiErrorMessage(error);

      if (!config.usePlaywrightFallback) {
        return { status: "failed", error: apiError };
      }

      try {
        const fallbackResult = await createCRCClientViaPlaywright(
          clientData,
          config,
        );

        return {
          status: "success",
          clientId: fallbackResult?.clientId || null,
        };
      } catch (playwrightError) {
        return {
          status: "failed",
          error: `${apiError} | Playwright fallback failed: ${playwrightError.message}`,
        };
      }
    }
  }

  return { createClient, isEnabled };
}

module.exports = { createCrcService };
