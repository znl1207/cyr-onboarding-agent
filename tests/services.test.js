const { createCrcService } = require("../src/services/crcService");
const { createGhlService } = require("../src/services/ghlService");
const { createTwilioService } = require("../src/services/twilioService");

describe("crcService", () => {
  it("skips when apiKey is not set", async () => {
    const svc = createCrcService({
      baseUrl: "http://localhost",
      createClientPath: "/clients",
    });
    expect(svc.isEnabled).toBe(false);
    const result = await svc.createClient({ firstName: "A" });
    expect(result.status).toBe("skipped");
  });
});

describe("ghlService", () => {
  it("skips when apiKey is not set", async () => {
    const svc = createGhlService({
      baseUrl: "http://localhost",
      contactPath: "/contacts/",
      opportunityPath: "/opportunities/",
    });
    expect(svc.isEnabled).toBe(false);
    const result = await svc.createOnboardingContact({ firstName: "A" });
    expect(result.status).toBe("skipped");
  });
});

describe("twilioService", () => {
  it("skips when credentials are incomplete", async () => {
    const svc = createTwilioService({});
    expect(svc.isEnabled).toBe(false);
    const result = await svc.sendApprovalSms("+1555", "Jane");
    expect(result.status).toBe("skipped");
  });
});
