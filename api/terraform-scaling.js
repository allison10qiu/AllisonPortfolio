const fs = require("fs");
const path = require("path");
const { verifyRequest, sendJson } = require("./_terraformAuth");

const ALLOWED = new Set([
  "superselect-ro.png",
  "superselect-empty.png",
  "select-ro.png",
  "select-empty.png",
  "select-edit.png",
  "toggle-ro.png",
  "toggle-empty.png",
  "toggle-edit.png",
  "checkbox-ro.png",
  "checkbox-empty.png",
  "checkbox-edit.png",
  "radio-ro.png",
  "radio-edit.png",
  "masked-ro.png",
  "masked-edit.png",
  "textinput-ro.png",
  "textinput-empty.png",
  "textinput-edit.png",
  "textarea-ro.png",
  "textarea-empty.png",
  "textarea-edit.png",
  "radiocard-ro.png",
  "radiocard-edit.png",
]);

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
    const url = new URL(req.url || "/", "http://localhost");
    const name = url.searchParams.get("name") || "";

    if (!ALLOWED.has(name)) {
      sendJson(res, 404, { ok: false, error: "Not found" });
      return;
    }

    if (!verifyRequest(req)) {
      sendJson(res, 401, { ok: false, error: "Unauthorized" });
      return;
    }

    const filePath = path.join(__dirname, "terraform-private", "scaling", name);
    const body = fs.readFileSync(filePath);

    res.statusCode = 200;
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", String(body.length));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "HEAD") {
      res.end();
      return;
    }
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
