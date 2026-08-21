const {
  requireEnv,
  signToken,
  passwordsEqual,
  sessionCookie,
  sendJson,
} = require("./_terraformAuth");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const passwordEnv = requireEnv("TERRAFORM_CASE_PASSWORD");
    const secret = requireEnv("TERRAFORM_CASE_SECRET");

    let body = "";
    await new Promise(function (resolve, reject) {
      req.on("data", function (chunk) {
        body += chunk;
        if (body.length > 4096) {
          reject(new Error("Body too large"));
        }
      });
      req.on("end", resolve);
      req.on("error", reject);
    });

    let parsed = {};
    try {
      parsed = body ? JSON.parse(body) : {};
    } catch (_) {
      sendJson(res, 400, { ok: false, error: "Invalid request" });
      return;
    }

    const submitted = typeof parsed.password === "string" ? parsed.password : "";
    if (!passwordsEqual(submitted, passwordEnv)) {
      sendJson(res, 401, { ok: false, error: "Incorrect password. Try again." });
      return;
    }

    const token = signToken(secret);
    res.setHeader("Set-Cookie", sessionCookie(token, req));
    sendJson(res, 200, { ok: true });
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
