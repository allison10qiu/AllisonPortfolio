#!/usr/bin/env python3
"""Local static server with Vercel-like cleanUrls + Terraform gate API shim."""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import re
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
COOKIE_NAME = "terraform_case"
TOKEN_PAYLOAD = "terraform-case-ok"


def load_dotenv_local() -> None:
    env_path = ROOT / ".env.local"
    if not env_path.is_file():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


load_dotenv_local()


def sign_token(secret: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        TOKEN_PAYLOAD.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def passwords_equal(submitted: str, expected: str) -> bool:
    a = hashlib.sha256(submitted.encode("utf-8")).digest()
    b = hashlib.sha256(expected.encode("utf-8")).digest()
    return hmac.compare_digest(a, b)


class CleanUrlHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header(
            "Cache-Control", "no-store, no-cache, must-revalidate, max-age=0"
        )
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def _json(self, status: int, body: dict, set_cookie: str | None = None):
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        if set_cookie:
            self.send_header("Set-Cookie", set_cookie)
        self.end_headers()
        self.wfile.write(data)

    def _read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 4096:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def _cookie_token(self) -> str:
        raw = self.headers.get("Cookie") or ""
        jar = SimpleCookie()
        try:
            jar.load(raw)
        except Exception:
            return ""
        morsel = jar.get(COOKIE_NAME)
        return morsel.value if morsel else ""

    def _session_cookie(self, value: str) -> str:
        # Session cookie (no Max-Age) for local parity with production.
        return f"{COOKIE_NAME}={value}; Path=/; HttpOnly; SameSite=Lax"

    def do_POST(self):  # noqa: N802
        parsed = urlsplit(self.path)
        path = unquote(parsed.path)
        if path == "/api/terraform-logout":
            self._json(
                200,
                {"ok": True},
                set_cookie=f"{COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
            )
            return
        if path == "/api/terraform-unlock":
            password = os.environ.get("TERRAFORM_CASE_PASSWORD")
            secret = os.environ.get("TERRAFORM_CASE_SECRET")
            if not password or not secret:
                self._json(
                    500,
                    {
                        "ok": False,
                        "error": "Server configuration error. Password gate is not ready.",
                    },
                )
                return
            body = self._read_json_body()
            submitted = body.get("password") if isinstance(body.get("password"), str) else ""
            if not passwords_equal(submitted, password):
                self._json(
                    401, {"ok": False, "error": "Incorrect password. Try again."}
                )
                return
            token = sign_token(secret)
            self._json(200, {"ok": True}, set_cookie=self._session_cookie(token))
            return
        self.send_error(404, "Not Found")

    def do_GET(self):  # noqa: N802
        parsed = urlsplit(self.path)
        path = unquote(parsed.path)
        query = f"?{parsed.query}" if parsed.query else ""

        if path == "/api/terraform-content":
            secret = os.environ.get("TERRAFORM_CASE_SECRET")
            if not secret:
                self._json(
                    500,
                    {
                        "ok": False,
                        "error": "Server configuration error. Password gate is not ready.",
                    },
                )
                return
            token = self._cookie_token()
            expected = sign_token(secret)
            if not token or not hmac.compare_digest(token, expected):
                self._json(401, {"ok": False, "error": "Unauthorized"})
                return
            fragment = ROOT / "api" / "terraform-locked.fragment.html"
            html = fragment.read_text(encoding="utf-8").encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(html)
            return

        # Block accidental static access to auth helpers / fragment
        if path in (
            "/api/terraform-locked.fragment.html",
            "/api/_terraformAuth",
            "/api/_terraformAuth.js",
        ):
            self.send_error(404, "Not Found")
            return

        if path == "/drafts" or path.startswith("/drafts/"):
            self.send_error(404, "Not Found")
            return

        if path == "/index.html":
            self.send_response(301)
            self.send_header("Location", "/" + query)
            self.end_headers()
            return

        if path.endswith(".html") and path != "/index.html":
            clean = path[: -len(".html")]
            self.send_response(301)
            self.send_header("Location", clean + query)
            self.end_headers()
            return

        if path != "/" and not Path(path).suffix:
            candidate = ROOT / path.lstrip("/")
            html = Path(str(candidate) + ".html")
            if html.is_file():
                self.path = "/" + html.relative_to(ROOT).as_posix() + query
                return super().do_GET()

        return super().do_GET()

    def log_message(self, fmt, *args):
        sys_stdout = __import__("sys").stdout
        sys_stdout.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=3000)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), CleanUrlHandler)
    print(f"Serving {ROOT} with cleanUrls at http://127.0.0.1:{args.port}/")
    if os.environ.get("TERRAFORM_CASE_PASSWORD") and os.environ.get(
        "TERRAFORM_CASE_SECRET"
    ):
        print("Terraform gate API enabled (local .env.local)")
    else:
        print(
            "Terraform gate API disabled — add TERRAFORM_CASE_PASSWORD + "
            "TERRAFORM_CASE_SECRET to .env.local"
        )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
