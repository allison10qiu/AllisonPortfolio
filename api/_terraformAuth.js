const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const COOKIE_NAME = "terraform_case";
const TOKEN_PAYLOAD = "terraform-case-ok";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    const err = new Error(`Missing environment variable: ${name}`);
    err.statusCode = 500;
    throw err;
  }
  return value;
}

function signToken(secret) {
  return crypto.createHmac("sha256", secret).update(TOKEN_PAYLOAD).digest("hex");
}

function tokensEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function passwordsEqual(submitted, expected) {
  const a = crypto.createHash("sha256").update(String(submitted || ""), "utf8").digest();
  const b = crypto.createHash("sha256").update(String(expected || ""), "utf8").digest();
  return crypto.timingSafeEqual(a, b);
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  String(header)
    .split(";")
    .forEach(function (part) {
      const idx = part.indexOf("=");
      if (idx === -1) return;
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (key) out[key] = decodeURIComponent(val);
    });
  return out;
}

function isHttps(req) {
  const proto = req.headers["x-forwarded-proto"] || "";
  return String(proto).split(",")[0].trim() === "https";
}

function sessionCookie(value, req) {
  // Session cookie: no Max-Age / Expires — cleared when the browser session ends.
  const parts = [
    COOKIE_NAME + "=" + encodeURIComponent(value),
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isHttps(req)) parts.push("Secure");
  return parts.join("; ");
}

function clearCookie(req) {
  const parts = [
    COOKIE_NAME + "=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (isHttps(req)) parts.push("Secure");
  return parts.join("; ");
}

function readCookieToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME] || "";
}

function verifyRequest(req) {
  const secret = requireEnv("TERRAFORM_CASE_SECRET");
  const token = readCookieToken(req);
  const expected = signToken(secret);
  return tokensEqual(token, expected);
}

function readLockedHtml() {
  const file = path.join(__dirname, "terraform-locked.fragment.html");
  return fs.readFileSync(file, "utf8");
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

module.exports = {
  COOKIE_NAME,
  requireEnv,
  signToken,
  passwordsEqual,
  sessionCookie,
  clearCookie,
  verifyRequest,
  readLockedHtml,
  sendJson,
};
