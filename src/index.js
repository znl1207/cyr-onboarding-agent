const axios = require("axios");
const { Telegraf } = require("telegraf");
const { config } = require("./config");
const { createDatabaseClient } = require("./db");
const { parseApplicantMessage, parseApprovalCommand } = require("./parser");
const { createCrcService } = require("./services/crcService");
const { createGhlService } = require("./services/ghlService");
const { createTwilioService } = require("./services/twilioService");
const { createOnboardingSubmission } = require("./workflows/onboardingWorkflow");
const { createHealthServer } = require("./healthServer");
const { logError, logInfo, logWarn } = require("./logger");

const FORMAT_HELP =
  'Send data in this format:\n"First Name, Last Name, DOB, SSN, Email, Phone"';
const APPROVAL_HELP =
  "To approve and send the client confirmation SMS, reply with: APPROVE <submissionId>";

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
  const twilioService = createTwilioService(config.twilio);

  bot.start((ctx) => {
    return ctx.reply(
      `Welcome to ${config.appName}.\n${FORMAT_HELP}\n\n${APPROVAL_HELP}`,
    );
  });

  bot.help((ctx) => {
    return ctx.reply(`${FORMAT_HELP}\n\n${APPROVAL_HELP}`);
  });

  bot.on("text", async (ctx) => {
    const text = ctx.message.text;

    try {
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
            "Approval is restricted to the configured admin chat only.",
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

        const smsResult = await twilioService.sendApprovalSms(
          submission.phone,
          submission.firstName,
        );

        await db.updateSmsResult(submission.id, smsResult);

        if (smsResult.status === "sent") {
          logInfo("Submission approved and SMS sent.", {
            submissionId: submission.id,
            phone: submission.phone,
          });
          await ctx.reply(
            `Approved #${submission.id}. Confirmation SMS sent to ${submission.phone}.`,
          );
        } else {
          logWarn("Submission approved but SMS not sent.", {
            submissionId: submission.id,
            smsStatus: smsResult.status,
            error: smsResult.error,
          });
          await ctx.reply(
            `Approved #${submission.id}. SMS was not sent (${smsResult.status}). ${smsResult.error || ""}`,
          );
        }

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
        crcService,
        ghlService,
      });

      await ctx.reply(
        [
          `Submission #${workflowResult.submissionId} received and stored securely.`,
          `CRC: ${workflowResult.crcResult.status}${
            workflowResult.crcResult.clientId
              ? ` (ID: ${workflowResult.crcResult.clientId})`
              : ""
          }`,
          `GHL: ${workflowResult.ghlResult.status}${
            workflowResult.ghlResult.contactId
              ? ` (ID: ${workflowResult.ghlResult.contactId})`
              : ""
          }`,
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
        `CRC status: ${workflowResult.crcResult.status}`,
        `GHL status: ${workflowResult.ghlResult.status}`,
        "",
        `Reply with: APPROVE ${workflowResult.submissionId}`,
      ].join("\n");

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
