const fs = require("fs");
const path = require("path");
const { verifyRequest, sendJson } = require("./_terraformAuth");

const FILE = path.join(__dirname, "terraform-private", "audit-flythrough.mp4");
const CHUNK = 2 * 1024 * 1024;

function parseRange(header, size) {
  if (!header || !String(header).startsWith("bytes=")) return null;
  const spec = String(header).slice(6).split(",")[0].trim();
  const dash = spec.indexOf("-");
  if (dash === -1) return null;
  const startText = spec.slice(0, dash);
  const endText = spec.slice(dash + 1);
  let start;
  let end;
  if (startText === "") {
    const suffix = parseInt(endText, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = parseInt(startText, 10);
    end = endText === "" ? size - 1 : parseInt(endText, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  }
  if (start < 0 || start >= size || end < start) return null;
  end = Math.min(end, size - 1, start + CHUNK - 1);
  return { start: start, end: end };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    if (!verifyRequest(req)) {
      sendJson(res, 401, { ok: false, error: "Unauthorized" });
      return;
    }

    const size = fs.statSync(FILE).size;
    const range = parseRange(req.headers.range, size);
    if (req.headers.range && !range) {
      res.statusCode = 416;
      res.setHeader("Content-Range", "bytes */" + size);
      res.end();
      return;
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    const start = range ? range.start : 0;
    const end = range ? range.end : Math.min(size - 1, CHUNK - 1);
    const partial = Boolean(range) || end < size - 1;
    res.statusCode = partial ? 206 : 200;
    res.setHeader("Content-Length", String(end - start + 1));
    if (partial) res.setHeader("Content-Range", "bytes " + start + "-" + end + "/" + size);
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(FILE, { start: start, end: end }).pipe(res);
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
