const {
  parseApplicantMessage,
  parseApprovalCommand,
} = require("../src/parser");

describe("parseApplicantMessage", () => {
  it("parses a valid six-field CSV line", () => {
    const result = parseApplicantMessage(
      "Jane, Doe, 1990-01-31, 123-45-6789, jane@example.com, +15551234567",
    );
    expect(result).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      dob: "1990-01-31",
      ssn: "123-45-6789",
      email: "jane@example.com",
      phone: "+15551234567",
    });
  });

  it("normalizes DOB in various formats", () => {
    const result = parseApplicantMessage(
      "A, B, 03/15/1985, 111-22-3333, a@b.com, 5551112222",
    );
    expect(result.dob).toBe("1985-03-15");
  });

  it("trims whitespace from all fields", () => {
    const result = parseApplicantMessage(
      "  Jane , Doe ,1990-01-31, 123-45-6789 , jane@example.com , +15551234567 ",
    );
    expect(result.firstName).toBe("Jane");
    expect(result.lastName).toBe("Doe");
    expect(result.phone).toBe("+15551234567");
  });

  it("throws on empty input", () => {
    expect(() => parseApplicantMessage("")).toThrow("Message is empty");
  });

  it("throws on non-string input", () => {
    expect(() => parseApplicantMessage(null)).toThrow("Message is empty");
  });

  it("throws when fewer than six fields", () => {
    expect(() => parseApplicantMessage("Jane, Doe, 1990-01-31")).toThrow(
      "Invalid format",
    );
  });

  it("throws when more than six fields", () => {
    expect(() =>
      parseApplicantMessage("a, b, 1990-01-31, ssn, e, p, extra"),
    ).toThrow("Invalid format");
  });

  it("throws on invalid DOB", () => {
    expect(() =>
      parseApplicantMessage("A, B, not-a-date, 111-22-3333, a@b.com, 555"),
    ).toThrow("DOB must be a valid date");
  });

  it("throws when a field is blank after trimming", () => {
    expect(() =>
      parseApplicantMessage("Jane, , 1990-01-31, 123-45-6789, a@b.com, 555"),
    ).toThrow("All six fields are required");
  });
});

describe("parseApprovalCommand", () => {
  it("parses APPROVE with ID", () => {
    expect(parseApprovalCommand("APPROVE 7")).toEqual({ submissionId: 7 });
  });

  it("parses /approve with ID", () => {
    expect(parseApprovalCommand("/approve 42")).toEqual({ submissionId: 42 });
  });

  it("parses approve without ID (latest pending)", () => {
    expect(parseApprovalCommand("approve")).toEqual({ submissionId: null });
  });

  it("parses APPROVE with # prefix on ID", () => {
    expect(parseApprovalCommand("APPROVE #12")).toEqual({ submissionId: 12 });
  });

  it("is case-insensitive", () => {
    expect(parseApprovalCommand("Approve 1")).toEqual({ submissionId: 1 });
  });

  it("returns null for non-approval text", () => {
    expect(parseApprovalCommand("hello world")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(parseApprovalCommand(123)).toBeNull();
    expect(parseApprovalCommand(null)).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(parseApprovalCommand("  APPROVE 5  ")).toEqual({ submissionId: 5 });
  });
});
