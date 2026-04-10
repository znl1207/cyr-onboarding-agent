const axios = require("axios");
const { createCRCClientViaPlaywright } = require("./crcPlaywright");
const { getApiErrorMessage } = require("./httpError");

function createCrcService(config) {
  const isEnabled = Boolean(config.apiKey);

  function toCrcDate(isoDate) {
    const [year, month, day] = String(isoDate).split("-");
    if (!year || !month || !day) {
      return "";
    }
    return `${month}/${day}/${year}`;
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function buildLegacyCrcXml(clientData) {
    const mobile = onlyDigits(clientData.phone);
    const ssnLast4 = onlyDigits(clientData.ssn).slice(-4);
    const birthDate = toCrcDate(clientData.dob);
    const email = String(clientData.email || "").trim();

    // CRC legacy endpoint expects XML-form payload with field tags.
    return [
      "<lead>",
      "<type>Client</type>",
      `<firstname>${escapeXml(clientData.firstName)}</firstname>`,
      `<lastname>${escapeXml(clientData.lastName)}</lastname>`,
      `<email>${escapeXml(email)}</email>`,
      `<phone_mobile>${escapeXml(mobile)}</phone_mobile>`,
      `<ssno>${escapeXml(ssnLast4)}</ssno>`,
      `<birth_date>${escapeXml(birthDate)}</birth_date>`,
      "</lead>",
    ].join("");
  }

  function parseLegacyClientId(responseData) {
    if (!responseData) {
      return null;
    }

    if (typeof responseData === "object") {
      return (
        responseData.id ||
        responseData.clientId ||
        responseData.client_id ||
        responseData.data?.id ||
        responseData.data?.clientId ||
        null
      );
    }

    const asText = String(responseData);
    const encryptedIdMatch = asText.match(
      /<id[^>]*>([^<]+)<\/id>|<encrypted_id[^>]*>([^<]+)<\/encrypted_id>/i,
    );
    return encryptedIdMatch
      ? encryptedIdMatch[1] || encryptedIdMatch[2] || null
      : null;
  }

  async function createClient(clientData) {
    if (!isEnabled) {
      return {
        status: "skipped",
        error: "CRC integration skipped because CRC_API_KEY is not set.",
      };
    }

    try {
      const response = config.secretKey
        ? await createClientLegacy(clientData, config)
        : await createClientJson(clientData, config);
      const clientId = response.clientId;

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

async function createClientJson(clientData, config) {
  const url = `${config.baseUrl.replace(/\/$/, "")}${config.createClientPath}`;
  const payload = {
    firstName: clientData.firstName,
    lastName: clientData.lastName,
    dob: clientData.dob,
    ssn: clientData.ssn,
    email: clientData.email,
    phone: clientData.phone,
  };

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
  return { clientId };
}

async function createClientLegacy(clientData, config) {
  const path = config.legacyInsertPath || "/api/lead/insertRecord";
  const url = `${config.baseUrl.replace(/\/$/, "")}${path}`;
  const xmlData = buildLegacyCrcXml(clientData);

  const payload = new URLSearchParams({
    apiauthkey: config.apiKey,
    secretkey: config.secretKey,
    xmlData,
  });

  const response = await axios.post(url, payload.toString(), {
    timeout: 15000,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return { clientId: parseLegacyClientId(response.data) };
}

function buildLegacyCrcXml(clientData) {
  const mobile = String(clientData.phone || "").replace(/\D/g, "");
  const ssnLast4 = String(clientData.ssn || "").replace(/\D/g, "").slice(-4);
  const [year, month, day] = String(clientData.dob || "").split("-");
  const birthDate =
    year && month && day ? `${month}/${day}/${year}` : String(clientData.dob);

  return [
    "<lead>",
    "<type>Client</type>",
    `<firstname>${escapeXml(clientData.firstName)}</firstname>`,
    `<lastname>${escapeXml(clientData.lastName)}</lastname>`,
    `<email>${escapeXml(clientData.email)}</email>`,
    `<phone_mobile>${escapeXml(mobile)}</phone_mobile>`,
    `<ssno>${escapeXml(ssnLast4)}</ssno>`,
    `<birth_date>${escapeXml(birthDate)}</birth_date>`,
    "</lead>",
  ].join("");
}

function parseLegacyClientId(responseData) {
  if (!responseData) {
    return null;
  }

  if (typeof responseData === "object") {
    return (
      responseData.id ||
      responseData.clientId ||
      responseData.client_id ||
      responseData.data?.id ||
      responseData.data?.clientId ||
      null
    );
  }

  const asText = String(responseData);
  const encryptedIdMatch = asText.match(
    /<id[^>]*>([^<]+)<\/id>|<encrypted_id[^>]*>([^<]+)<\/encrypted_id>/i,
  );
  return encryptedIdMatch
    ? encryptedIdMatch[1] || encryptedIdMatch[2] || null
    : null;
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

module.exports = { createCrcService };
