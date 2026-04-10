const { logInfo, logWarn, logError } = require("../src/logger");

describe("logger", () => {
  let output;
  const originalWrite = process.stdout.write;

  beforeEach(() => {
    output = "";
    process.stdout.write = (chunk) => {
      output += chunk;
    };
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
  });

  it("logInfo writes JSON with level info", () => {
    logInfo("test message");
    const parsed = JSON.parse(output.trim());
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
    expect(parsed.timestamp).toBeDefined();
  });

  it("logWarn writes JSON with level warn", () => {
    logWarn("warning");
    const parsed = JSON.parse(output.trim());
    expect(parsed.level).toBe("warn");
  });

  it("logError writes JSON with level error", () => {
    logError("error occurred");
    const parsed = JSON.parse(output.trim());
    expect(parsed.level).toBe("error");
  });

  it("includes metadata when provided", () => {
    logInfo("with meta", { key: "value" });
    const parsed = JSON.parse(output.trim());
    expect(parsed.metadata.key).toBe("value");
  });

  it("redacts sensitive keys in metadata", () => {
    logInfo("sensitive", {
      ssn: "123-45-6789",
      apiKey: "secret",
      password: "pass",
      safeField: "visible",
    });
    const parsed = JSON.parse(output.trim());
    expect(parsed.metadata.ssn).toBe("[REDACTED]");
    expect(parsed.metadata.apiKey).toBe("[REDACTED]");
    expect(parsed.metadata.password).toBe("[REDACTED]");
    expect(parsed.metadata.safeField).toBe("visible");
  });
});
