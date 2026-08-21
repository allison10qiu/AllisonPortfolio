const { clearCookie, sendJson } = require("./_terraformAuth");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST" && req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  res.setHeader("Set-Cookie", clearCookie(req));
  sendJson(res, 200, { ok: true });
};
