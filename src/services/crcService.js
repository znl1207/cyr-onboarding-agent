const axios = require("axios");
const { createCRCClientViaPlaywright } = require("./crcPlaywright");
const { getApiErrorMessage } = require("./httpError");

function createCrcService(config) {
  const isEnabled = Boolean(config.apiKey);
  const resolvedMode = resolveCrcMode(config);

  async function createClient(clientData) {
    if (!isEnabled) {
      return {
        status: "skipped",
        error: "CRC integration skipped because CRC_API_KEY is not set.",
      };
    }

    try {
      const response =
        resolvedMode === "legacy_xml"
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

function resolveCrcMode(config) {
  const mode = String(config.apiMode || "auto").toLowerCase();
  if (mode === "legacy_xml" || mode === "legacy" || mode === "xml") {
    return "legacy_xml";
  }
  if (mode === "json") {
    return "json";
  }

  // Auto mode: CRC secret key usually means legacy XML API.
  return config.secretKey ? "legacy_xml" : "json";
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
  if (!config.secretKey) {
    throw new Error(
      "CRC legacy mode requires CRC_SECRET_KEY to be configured.",
    );
  }

  const url = `${config.baseUrl.replace(/\/$/, "")}${config.createClientPath}`;
  const xmlData = buildLegacyCrcXml({
    ...clientData,
    clientStatus: config.clientStatus,
    referredByFirstName: config.referredByFirstName,
    referredByLastName: config.referredByLastName,
    portalAccessEnabled: config.portalAccessEnabled,
    sendPortalPasswordEmail: config.sendPortalPasswordEmail,
  });

  const payload = new URLSearchParams({
    apiauthkey: config.apiKey,
    secretkey: config.secretKey,
    type: config.clientStatus || "Client",
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
  const mobile = onlyDigits(clientData.phone);
  const ssnLast4 = onlyDigits(clientData.ssn).slice(-4);
  const birthDate = toCrcDate(clientData.dob);
  const email = String(clientData.email || "").trim();
  const referredByFirstName = String(clientData.referredByFirstName || "").trim();
  const referredByLastName = String(clientData.referredByLastName || "").trim();
  const enablePortalAccess = Boolean(clientData.portalAccessEnabled) && Boolean(email);
  const portalAccessValue = enablePortalAccess ? "on" : "off";
  const sendPortalPasswordEmail = clientData.sendPortalPasswordEmail
    ? "yes"
    : "no";

  const fields = [
    "<lead>",
    `<type>${escapeXml(clientData.clientStatus || "Client")}</type>`,
    `<firstname>${escapeXml(clientData.firstName)}</firstname>`,
    `<lastname>${escapeXml(clientData.lastName)}</lastname>`,
    `<email>${escapeXml(email)}</email>`,
    `<phone_mobile>${escapeXml(mobile)}</phone_mobile>`,
    `<phone_home>${escapeXml(mobile)}</phone_home>`,
    `<ssno>${escapeXml(ssnLast4)}</ssno>`,
    `<birth_date>${escapeXml(birthDate)}</birth_date>`,
    `<client_portal_access>${portalAccessValue}</client_portal_access>`,
  ];

  if (enablePortalAccess) {
    fields.push(`<client_userid>${escapeXml(email)}</client_userid>`);
    fields.push(
      `<send_setup_password_info_via_email>${sendPortalPasswordEmail}</send_setup_password_info_via_email>`,
    );
  }

  if (referredByFirstName) {
    fields.push(
      `<referred_by_firstname>${escapeXml(referredByFirstName)}</referred_by_firstname>`,
    );
  }

  if (referredByLastName) {
    fields.push(
      `<referred_by_lastname>${escapeXml(referredByLastName)}</referred_by_lastname>`,
    );
  }

  fields.push("</lead>");
  return fields.join("");
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

function toCrcDate(isoDate) {
  const [year, month, day] = String(isoDate || "").split("-");
  if (!year || !month || !day) {
    return "";
  }
  return `${month}/${day}/${year}`;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
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
