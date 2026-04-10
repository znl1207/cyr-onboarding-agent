const http = require("http");
const { createHealthServer } = require("../src/healthServer");

function request(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}${path}`, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        });
      })
      .on("error", reject);
  });
}

describe("healthServer", () => {
  let hs;

  afterEach(async () => {
    if (hs) await hs.stop();
  });

  it("resolves immediately when port is falsy (disabled)", async () => {
    hs = createHealthServer({
      port: null,
      appName: "test",
      nodeEnv: "test",
      logger: { info: jest.fn(), error: jest.fn() },
      dbHealthcheck: async () => {},
    });
    await hs.start();
  });

  it("returns 200 with ok:true when DB check passes", async () => {
    const port = 19876;
    hs = createHealthServer({
      port,
      appName: "unit-test",
      nodeEnv: "test",
      logger: { info: jest.fn(), error: jest.fn() },
      dbHealthcheck: async () => {},
    });
    await hs.start();

    const res = await request(port, "/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.checks.database).toBe("ok");
    expect(res.body.app).toBe("unit-test");
  });

  it("returns 503 when DB check fails", async () => {
    const port = 19877;
    hs = createHealthServer({
      port,
      appName: "unit-test",
      nodeEnv: "test",
      logger: { info: jest.fn(), error: jest.fn() },
      dbHealthcheck: async () => {
        throw new Error("connection refused");
      },
    });
    await hs.start();

    const res = await request(port, "/health");
    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.checks.database).toBe("error");
    expect(res.body.checks.databaseError).toBe("connection refused");
  });

  it("returns 404 for unknown paths", async () => {
    const port = 19878;
    hs = createHealthServer({
      port,
      appName: "unit-test",
      nodeEnv: "test",
      logger: { info: jest.fn(), error: jest.fn() },
      dbHealthcheck: async () => {},
    });
    await hs.start();

    const res = await request(port, "/unknown");
    expect(res.status).toBe(404);
  });
});
