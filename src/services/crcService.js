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
      if (!clientId) {
        throw new Error(
          `CRC did not return a client ID. Response: ${
            response.responseSummary || "(empty response)"
          }`,
        );
      }

      return {
        status: "success",
        clientId: String(clientId),
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
  return { clientId, responseSummary: summarizeResponse(responseData) };
}

async function createClientLegacy(clientData, config) {
  if (!config.secretKey) {
    throw new Error(
      "CRC legacy mode requires CRC_SECRET_KEY to be configured.",
    );
  }

  const url = `${config.baseUrl.replace(/\/$/, "")}${config.createClientPath}`;
  const statusCandidates = uniqueNonEmpty([
    config.clientStatus,
    "Client",
    "Lead",
    "Lead/Inactive",
    "Inactive",
    "Suspended",
  ]);

  let lastError = null;
  for (const statusValue of statusCandidates) {
    for (const includeTypeTag of [true, false]) {
      for (const includeTypeParam of [true, false]) {
      const xmlData = buildLegacyCrcXml({
        ...clientData,
        clientStatus: statusValue,
        includeTypeTag,
        referredByFirstName: config.referredByFirstName,
        referredByLastName: config.referredByLastName,
        clientAgreement: config.clientAgreement,
        portalAccessEnabled: config.portalAccessEnabled,
        sendPortalPasswordEmail: config.sendPortalPasswordEmail,
      });

      const payload = new URLSearchParams({
        apiauthkey: config.apiKey,
        secretkey: config.secretKey,
        xmlData,
      });
      if (includeTypeParam) {
        payload.set("type", statusValue);
      }

      const response = await axios.post(url, payload.toString(), {
        timeout: 15000,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const errorDetails = parseLegacyErrorDetails(response.data);
      if (errorDetails) {
        lastError = errorDetails;

        // CRC status-type validation error; try other known values automatically.
        if (errorDetails.errorNo === "4401") {
          continue;
        }

        throw new Error(`CRC API error: ${errorDetails.summary}`);
      }

      return {
        clientId: parseLegacyClientId(response.data),
        responseSummary: summarizeResponse(response.data),
      };
      }
    }
  }

  if (lastError) {
    throw new Error(`CRC API error: ${lastError.summary}`);
  }

  throw new Error("CRC API call failed without a response.");
}

function buildLegacyCrcXml(clientData) {
  const mobile = onlyDigits(clientData.phone);
  const ssnLast4 = onlyDigits(clientData.ssn).slice(-4);
  const birthDate = toCrcDate(clientData.dob);
  const email = String(clientData.email || "").trim();
  const referredByFirstName = String(clientData.referredByFirstName || "").trim();
  const referredByLastName = String(clientData.referredByLastName || "").trim();
  const clientAgreement = String(clientData.clientAgreement || "").trim();
  const enablePortalAccess = Boolean(clientData.portalAccessEnabled) && Boolean(email);
  const portalAccessValue = enablePortalAccess ? "on" : "off";
  const sendPortalPasswordEmail = clientData.sendPortalPasswordEmail
    ? "yes"
    : "no";

  const fields = [
    "<lead>",
  ];

  if (clientData.includeTypeTag !== false) {
    fields.push(`<type>${escapeXml(clientData.clientStatus || "Client")}</type>`);
  }

  fields.push(
    `<firstname>${escapeXml(clientData.firstName)}</firstname>`,
    `<lastname>${escapeXml(clientData.lastName)}</lastname>`,
    `<email>${escapeXml(email)}</email>`,
    `<phone_mobile>${escapeXml(mobile)}</phone_mobile>`,
    `<phone_home>${escapeXml(mobile)}</phone_home>`,
    `<ssno>${escapeXml(ssnLast4)}</ssno>`,
    `<birth_date>${escapeXml(birthDate)}</birth_date>`,
    `<client_portal_access>${portalAccessValue}</client_portal_access>`,
  );

  if (enablePortalAccess) {
    fields.push(`<client_userid>${escapeXml(email)}</client_userid>`);
    if (clientAgreement) {
      fields.push(`<client_agreement>${escapeXml(clientAgreement)}</client_agreement>`);
    }
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
      responseData.encrypted_id ||
      responseData.data?.id ||
      responseData.data?.clientId ||
      responseData.data?.encrypted_id ||
      null
    );
  }

  const asText = String(responseData);
  const encryptedIdMatch = asText.match(
    /<id[^>]*>([^<]+)<\/id>|<encrypted_id[^>]*>([^<]+)<\/encrypted_id>|<client_id[^>]*>([^<]+)<\/client_id>/i,
  );
  if (encryptedIdMatch) {
    return encryptedIdMatch[1] || encryptedIdMatch[2] || encryptedIdMatch[3] || null;
  }

  const tokenMatch = asText.match(
    /\b(?:client[_\s-]*id|encrypted[_\s-]*id|id)\b\s*[:=]\s*([a-zA-Z0-9+/=_-]{3,})/i,
  );
  return tokenMatch ? tokenMatch[1] : null;
}

function parseLegacyErrorDetails(responseData) {
  const summary = summarizeResponse(responseData);
  const text = summary.toLowerCase();
  const errorSignals = [
    "error",
    "invalid",
    "not authorized",
    "unauthorized",
    "missing",
    "failed",
    "exception",
  ];

  const hasErrorSignal = errorSignals.some((signal) => text.includes(signal));
  if (!hasErrorSignal) {
    return null;
  }

  const errorNoMatch = summary.match(/<error_no>\s*([^<]+)\s*<\/error_no>/i);
  const errorNo = errorNoMatch ? errorNoMatch[1].trim() : null;

  return { errorNo, summary };
}

function summarizeResponse(responseData) {
  const asText =
    typeof responseData === "string"
      ? responseData
      : JSON.stringify(responseData || {});
  return asText.replace(/\s+/g, " ").trim().slice(0, 280);
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

function uniqueNonEmpty(values) {
  return [...new Set(values.map((value) => String(value || "").trim()))].filter(
    Boolean,
  );
}

module.exports = { createCrcService };
