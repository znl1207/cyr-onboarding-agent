const http = require("http");
const url = require("url");

function createHealthServer(options) {
  const {
    port,
    appName,
    nodeEnv,
    logger,
    dbHealthcheck,
    healthPath = "/health",
  } = options;

  const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url || "/");
    if (req.method !== "GET" || parsed.pathname !== healthPath) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Not found" }));
      return;
    }

    let database = "unknown";
    let ok = true;
    let dbError = null;

    if (typeof dbHealthcheck === "function") {
      try {
        await dbHealthcheck();
        database = "ok";
      } catch (error) {
        ok = false;
        database = "error";
        dbError = error.message;
      }
    }

    const payload = {
      ok,
      app: appName,
      env: nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: {
        database,
      },
    };

    if (dbError) {
      payload.checks.databaseError = dbError;
    }

    res.statusCode = ok ? 200 : 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(payload));
  });

  server.on("error", (error) => {
    logger.error("health_server_error", { error: error.message });
  });

  function start() {
    if (!port) {
      logger.info("health_server_disabled", {
        reason: "PORT env var not set",
      });
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      server.listen(port, () => {
        logger.info("health_server_started", { port, healthPath });
        resolve();
      });
    });
  }

  function stop() {
    return new Promise((resolve) => {
      if (!server.listening) {
        resolve();
        return;
      }

      server.close(() => resolve());
    });
  }

  return { start, stop };
}

module.exports = { createHealthServer };
