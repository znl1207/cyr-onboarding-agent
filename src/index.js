const axios = require("axios");
const { Telegraf } = require("telegraf");
const { config } = require("./config");
const { createDatabaseClient } = require("./db");
const {
  parseApplicantMessage,
  parseApprovalCommand,
  parseDocsReceivedCommand,
} = require("./parser");
const { createCrcService } = require("./services/crcService");
const { createGhlService } = require("./services/ghlService");
const { createGoogleSheetsService } = require("./services/googleSheetsService");
const { createZapierService } = require("./services/zapierService");
const { createOnboardingSubmission } = require("./workflows/onboardingWorkflow");
const { createHealthServer } = require("./healthServer");
const { logError, logInfo, logWarn } = require("./logger");

const FORMAT_HELP =
  'Send data in this format:\n"First Name, Last Name, DOB (MM/DD/YYYY), SSN, Email, Phone"\nExample: Jane, Doe, 01/31/1990, 123-45-6789, jane@example.com, +15551234567';
const APPROVAL_HELP = "To approve, reply with: APPROVE <submissionId>";
const DOCS_HELP =
  "When docs are received, reply with: DOCS_RECEIVED <submissionId>";

async function verifyTelegramToken(botToken) {
  const url = `https://api.telegram.org/bot${botToken}/getMe`;
  const response = await axios.get(url);

  if (!response.data?.ok) {
    throw new Error("Unable to verify Telegram bot token.");
  }

  logInfo("Connected Telegram bot.", {
    username: response.data.result.username,
  });
}

async function bootstrap() {
  const db = createDatabaseClient(config.databaseUrl);
  await db.init();
  const healthServer = createHealthServer({
    port: config.port,
    appName: config.appName,
    nodeEnv: config.nodeEnv,
    logger: {
      info: (event, data) => logInfo(event, data),
      error: (event, data) => logError(event, data),
    },
    dbHealthcheck: () => db.ping(),
  });
  await healthServer.start();

  await verifyTelegramToken(config.telegramBotToken);

  const bot = new Telegraf(config.telegramBotToken);
  const crcService = createCrcService(config.crc);
  const ghlService = createGhlService(config.ghl);
  const googleSheetsService = createGoogleSheetsService(config.googleSheets);
  const showGhlStatus = ghlService.isEnabled;
  const zapierService = createZapierService(config.zapier);

  bot.start((ctx) => {
    return ctx.reply(
      `Welcome to ${config.appName}.\n${FORMAT_HELP}\n\n${APPROVAL_HELP}\n${DOCS_HELP}`,
    );
  });

  bot.help((ctx) => {
    return ctx.reply(`${FORMAT_HELP}\n\n${APPROVAL_HELP}\n${DOCS_HELP}`);
  });

  bot.command("chatid", async (ctx) => {
    const configuredAdminChatId = config.adminChatId || "(not set)";
    await ctx.reply(
      `Chat ID: ${ctx.chat.id}\nConfigured ADMIN_CHAT_ID: ${configuredAdminChatId}`,
    );
  });

  bot.on("text", async (ctx) => {
    const text = ctx.message.text;

    try {
      const docsCommand = parseDocsReceivedCommand(text);
      if (docsCommand) {
        if (
          config.adminChatId &&
          String(ctx.chat.id) !== String(config.adminChatId)
        ) {
          await ctx.reply(
            `Docs confirmation is restricted to the configured admin chat only.\nThis chat ID: ${ctx.chat.id}\nConfigured ADMIN_CHAT_ID: ${config.adminChatId}`,
          );
          return;
        }

        const submission = await db.getSubmissionById(docsCommand.submissionId);
        if (!submission) {
          await ctx.reply(
            `Submission #${docsCommand.submissionId} not found for docs confirmation.`,
          );
          return;
        }

        await db.markDocsReceived(submission.id, {
          adminChatId: ctx.chat.id,
          adminUserId: ctx.from?.id,
        });

        const fulfillmentResult = await googleSheetsService.appendFulfillmentRow(
          submission,
        );
        await db.updateFulfillmentResult(submission.id, fulfillmentResult);

        if (fulfillmentResult.status === "success") {
          await ctx.reply(
            `Docs received for #${submission.id}. Added to fulfillment sheet${fulfillmentResult.rowNumber ? ` (row ${fulfillmentResult.rowNumber})` : ""}. ${config.zapier.completionMessage}`,
          );
        } else {
          await ctx.reply(
            `Docs received for #${submission.id}, but fulfillment sync is ${fulfillmentResult.status}. ${fulfillmentResult.error || ""}`,
          );
        }

        return;
      }

      const approvalCommand = parseApprovalCommand(text);

      if (approvalCommand) {
        if (
          config.adminChatId &&
          String(ctx.chat.id) !== String(config.adminChatId)
        ) {
          logWarn("Unauthorized approval command attempt.", {
            chatId: ctx.chat.id,
            userId: ctx.from?.id,
          });
          await ctx.reply(
            `Approval is restricted to the configured admin chat only.\nThis chat ID: ${ctx.chat.id}\nConfigured ADMIN_CHAT_ID: ${config.adminChatId}`,
          );
          return;
        }

        const submission = approvalCommand.submissionId
          ? await db.getSubmissionById(approvalCommand.submissionId)
          : await db.getLatestPendingSubmission();

        if (!submission) {
          await ctx.reply("No pending submission found to approve.");
          return;
        }

        if (submission.approvalStatus !== "pending") {
          await ctx.reply(
            `Submission #${submission.id} is already ${submission.approvalStatus}.`,
          );
          return;
        }

        await db.markApproved(submission.id, {
          adminChatId: ctx.chat.id,
          adminUserId: ctx.from?.id,
        });

        logInfo("Submission approved.", {
          submissionId: submission.id,
        });
        await ctx.reply(`Approved #${submission.id}.`);

        return;
      }

      const parsed = parseApplicantMessage(text);

      // Requirement: log all parsed fields to console.
      logInfo("Parsed incoming applicant message.", {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        dob: parsed.dob,
        ssn: parsed.ssn,
        email: parsed.email,
        phone: parsed.phone,
      });

      const workflowResult = await createOnboardingSubmission({
        parsedApplicant: parsed,
        sourceChatId: ctx.chat.id,
        sourceUserId: ctx.from?.id,
        database: db,
        config,
        zapierService,
        crcService,
        ghlService,
      });

      if (workflowResult.crcResult.status === "failed") {
        logWarn("CRC client creation failed.", {
          submissionId: workflowResult.submissionId,
          error: workflowResult.crcResult.error,
        });
      }

      if (workflowResult.ghlResult.status === "failed") {
        logWarn("GHL contact creation failed.", {
          submissionId: workflowResult.submissionId,
          error: workflowResult.ghlResult.error,
        });
      }

      await ctx.reply(
        [
          `Submission #${workflowResult.submissionId} received and stored securely.`,
          `${
            zapierService.isEnabled ? "Dispatch" : "CRC"
          }: ${workflowResult.crcResult.status}${
            workflowResult.crcResult.clientId
              ? ` (ID: ${workflowResult.crcResult.clientId})`
              : ""
          }${
            workflowResult.crcResult.error
              ? ` - ${workflowResult.crcResult.error}`
              : ""
          }`,
          ...(showGhlStatus
            ? [
                `GHL: ${workflowResult.ghlResult.status}${
                  workflowResult.ghlResult.contactId
                    ? ` (ID: ${workflowResult.ghlResult.contactId})`
                    : ""
                }${
                  workflowResult.ghlResult.error
                    ? ` - ${workflowResult.ghlResult.error}`
                    : ""
                }`,
              ]
            : []),
        ].join("\n"),
      );

      const reviewChatId = config.adminChatId || ctx.chat.id;
      const adminReviewMessage = [
        `New onboarding submission #${workflowResult.submissionId}`,
        "",
        `First Name: ${parsed.firstName}`,
        `Last Name: ${parsed.lastName}`,
        `DOB: ${parsed.dob}`,
        `SSN: ${parsed.ssn}`,
        `Email: ${parsed.email}`,
        `Phone: ${parsed.phone}`,
        "",
        `${zapierService.isEnabled ? "Dispatch" : "CRC"} status: ${workflowResult.crcResult.status}`,
        workflowResult.crcResult.error
          ? `${zapierService.isEnabled ? "Dispatch" : "CRC"} error: ${workflowResult.crcResult.error}`
          : null,
        ...(showGhlStatus
          ? [
              `GHL status: ${workflowResult.ghlResult.status}`,
              workflowResult.ghlResult.error
                ? `GHL error: ${workflowResult.ghlResult.error}`
                : null,
            ]
          : []),
        "",
        `Reply with: APPROVE ${workflowResult.submissionId}`,
      ]
        .filter(Boolean)
        .join("\n");

      await bot.telegram.sendMessage(reviewChatId, adminReviewMessage);
      logInfo("Submission created and review message sent.", {
        submissionId: workflowResult.submissionId,
        reviewChatId,
      });
    } catch (error) {
      logError("Failed to process message.", {
        error: error.message,
        stack: error.stack,
      });
      await ctx.reply(
        `Could not process your message.\n${FORMAT_HELP}\n\nError: ${error.message}`,
      );
    }
  });

  await bot.launch();
  logInfo("Bot is running.", { port: config.port });

  const gracefulShutdown = async (signal) => {
    logInfo("Received shutdown signal.", { signal });
    bot.stop(signal);
    await healthServer.stop();
    await db.close();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void gracefulShutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void gracefulShutdown("SIGTERM");
  });
}

bootstrap().catch((error) => {
  logError("Application failed to start.", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
