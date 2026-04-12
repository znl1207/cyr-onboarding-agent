const { google } = require("googleapis");

function createGoogleSheetsService(config) {
  const clientEmail = config.serviceAccount?.clientEmail;
  const privateKey = config.serviceAccount?.privateKey;
  const isEnabled = Boolean(config.sheetId && clientEmail && privateKey);

  async function appendFulfillmentRow(submission) {
    if (!isEnabled) {
      return {
        status: "skipped",
        error:
          "Google Sheets sync skipped because GOOGLE_SHEET_ID or service account credentials are missing.",
      };
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const values = [
      [
        new Date().toISOString(),
        submission.id,
        submission.firstName,
        submission.lastName,
        submission.email,
        submission.phone,
        submission.crcClientId || "",
        config.completionNote,
      ],
    ];

    try {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: config.sheetId,
        range: `${config.sheetName}!A:H`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values },
      });

      const updatedRange = response.data?.updates?.updatedRange || "";
      const rowMatch = updatedRange.match(/!(?:[A-Z]+)(\d+):/);
      const rowNumber = rowMatch ? Number(rowMatch[1]) : null;

      return {
        status: "success",
        rowNumber,
        updatedRange,
      };
    } catch (error) {
      return {
        status: "failed",
        error: error.message,
      };
    }
  }

  return { isEnabled, appendFulfillmentRow };
}

module.exports = { createGoogleSheetsService };
