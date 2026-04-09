const { Telegraf } = require("telegraf");
const { encrypt } = require("./crypto");
const { insertUser } = require("./db");

function createBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  bot.start((ctx) =>
    ctx.reply(
      "Welcome to the Onboarding Agent!\n\n" +
        "Send your details in this format:\n" +
        "First Name, Last Name, DOB, SSN, Email, Phone\n\n" +
        "Example:\n" +
        "Jane, Doe, 01/15/1990, 123-45-6789, jane@example.com, 555-123-4567"
    )
  );

  bot.help((ctx) =>
    ctx.reply(
      "Send a message with your info separated by commas:\n" +
        "First Name, Last Name, DOB, SSN, Email, Phone"
    )
  );

  bot.on("text", async (ctx) => {
    const raw = ctx.message.text.trim();
    const parts = raw.split(",").map((s) => s.trim());

    if (parts.length !== 6) {
      return ctx.reply(
        "Invalid format. Please send exactly 6 comma-separated fields:\n" +
          "First Name, Last Name, DOB, SSN, Email, Phone"
      );
    }

    const [firstName, lastName, dob, ssn, email, phone] = parts;

    if (!firstName || !lastName || !dob || !ssn || !email || !phone) {
      return ctx.reply("All fields are required. Please try again.");
    }

    console.log("--- New onboarding submission ---");
    console.log("  First Name:", firstName);
    console.log("  Last Name: ", lastName);
    console.log("  DOB:       ", dob);
    console.log("  SSN:       ", ssn);
    console.log("  Email:     ", email);
    console.log("  Phone:     ", phone);

    try {
      const ssnEncrypted = encrypt(ssn);

      const id = await insertUser({
        firstName,
        lastName,
        dob,
        ssnEncrypted,
        email,
        phone,
      });

      console.log("  Stored with id:", id);
      await ctx.reply(
        `Thanks, ${firstName}! Your information has been securely recorded (ID: ${id}).`
      );
    } catch (err) {
      console.error("Error storing user:", err);
      await ctx.reply(
        "Something went wrong while saving your data. Please try again later."
      );
    }
  });

  return bot;
}

module.exports = { createBot };
