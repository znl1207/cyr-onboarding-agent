const { getApiErrorMessage } = require("../src/services/httpError");

describe("getApiErrorMessage", () => {
  it("returns Unknown error for null", () => {
    expect(getApiErrorMessage(null)).toBe("Unknown error");
  });

  it("returns HTTP status and body when response exists", () => {
    const error = {
      response: { status: 422, data: { msg: "bad" } },
    };
    const msg = getApiErrorMessage(error);
    expect(msg).toContain("HTTP 422");
    expect(msg).toContain("bad");
  });

  it("returns no-response message when only request exists", () => {
    const error = { request: {} };
    expect(getApiErrorMessage(error)).toBe(
      "No response received from upstream API.",
    );
  });

  it("returns error.message as fallback", () => {
    expect(getApiErrorMessage(new Error("boom"))).toBe("boom");
  });
});
