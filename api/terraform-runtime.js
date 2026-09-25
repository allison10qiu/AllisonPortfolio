const { verifyRequest, readPrivateFile, sendJson } = require("./_terraformAuth");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    if (!verifyRequest(req)) {
      sendJson(res, 401, { ok: false, error: "Unauthorized" });
      return;
    }

    const body = readPrivateFile("support.js");
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(body);
  } catch (err) {
    const status = err.statusCode || 500;
    sendJson(res, status, {
      ok: false,
      error:
        status === 500
          ? "Server configuration error. Password gate is not ready."
          : err.message || "Request failed",
    });
  }
};
