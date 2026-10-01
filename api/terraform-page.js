const fs = require("fs");
const path = require("path");
const { clearCookie, sendJson } = require("./_terraformAuth");

function locatePage() {
  const candidates = [
    path.join(process.cwd(), "projects", "terraform.html"),
    path.join(__dirname, "..", "projects", "terraform.html"),
    path.join(__dirname, "projects", "terraform.html"),
  ];
  for (let i = 0; i < candidates.length; i++) {
    if (fs.existsSync(candidates[i])) return candidates[i];
  }
  const err = new Error("Terraform page missing");
  err.statusCode = 500;
  throw err;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const html = fs.readFileSync(locatePage());
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Set-Cookie", clearCookie(req));
    res.end(req.method === "HEAD" ? undefined : html);
  } catch (err) {
    sendJson(res, err.statusCode || 500, {
      ok: false,
      error: "Server configuration error. Password gate is not ready.",
    });
  }
};
