#!/usr/bin/env python3
"""Local static server with Vercel-like cleanUrls + Terraform gate API shim."""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import re
import socket
import threading
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

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

        if path == "/api/terraform-prototype":
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
            private = ROOT / "api" / "terraform-private"
            html = (private / "policy-set.html").read_text(encoding="utf-8")
            tag = '<script src="./support.js"></script>'
            if tag not in html:
                self._json(
                    500,
                    {
                        "ok": False,
                        "error": "Server configuration error. Password gate is not ready.",
                    },
                )
                return
            body = html.replace(
                tag, '<script src="/api/terraform-runtime"></script>', 1
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Frame-Options", "SAMEORIGIN")
            self.end_headers()
            self.wfile.write(body)
            return

        if path == "/api/terraform-runtime":
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
            body = (ROOT / "api" / "terraform-private" / "support.js").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return

        if path == "/api/terraform-scaling":
            allowed = {
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
            }
            qs = parse_qs(parsed.query)
            name = (qs.get("name") or [""])[0]
            if name not in allowed:
                self._json(404, {"ok": False, "error": "Not found"})
                return
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
            scaling_dir = (ROOT / "api" / "terraform-private" / "scaling").resolve()
            file_path = (scaling_dir / name).resolve()
            if file_path.parent != scaling_dir or not file_path.is_file():
                self._json(404, {"ok": False, "error": "Not found"})
                return
            body = file_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(body)
            return

        if path == "/api/terraform-audit":
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
            file_path = (
                ROOT / "api" / "terraform-private" / "audit-flythrough.mp4"
            ).resolve()
            private_dir = (ROOT / "api" / "terraform-private").resolve()
            if file_path.parent != private_dir or not file_path.is_file():
                self._json(404, {"ok": False, "error": "Not found"})
                return
            size = file_path.stat().st_size
            start, end, status = 0, size - 1, 200
            range_header = self.headers.get("Range")
            if range_header and range_header.startswith("bytes="):
                spec = range_header[6:].split(",", 1)[0].strip()
                if "-" not in spec:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return
                left, right = spec.split("-", 1)
                try:
                    if left == "":
                        suffix = int(right)
                        start = max(0, size - suffix)
                        end = size - 1
                    else:
                        start = int(left)
                        end = int(right) if right else size - 1
                except ValueError:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return
                if start < 0 or start >= size or end < start:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return
                end = min(end, size - 1)
                status = 206
            length = end - start + 1
            self.send_response(status)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(length))
            self.send_header("Cache-Control", "private, no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            if status == 206:
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.end_headers()
            if self.command == "HEAD":
                return
            with file_path.open("rb") as handle:
                handle.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = handle.read(min(262144, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
            return

        # Block accidental static access to auth helpers / fragment / prototype
        if path in (
            "/api/terraform-locked.fragment.html",
            "/api/_terraformAuth",
            "/api/_terraformAuth.js",
        ) or path == "/api/terraform-private" or path.startswith(
            "/api/terraform-private/"
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


class IPv6HTTPServer(ThreadingHTTPServer):
    address_family = socket.AF_INET6

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
        super().server_bind()


def listen(host: str, port: int):
    # Browsers resolve "localhost" to ::1 first. A 127.0.0.1-only socket
    # makes that tab fail, so loopback listens on both families.
    if host in {"127.0.0.1", "localhost", "::1"}:
        servers = [
            ThreadingHTTPServer(("127.0.0.1", port), CleanUrlHandler),
            IPv6HTTPServer(("::1", port), CleanUrlHandler),
        ]
    else:
        servers = [ThreadingHTTPServer((host, port), CleanUrlHandler)]
    for server in servers:
        threading.Thread(target=server.serve_forever, daemon=True).start()
    return servers


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=3000)
    args = parser.parse_args()
    servers = listen(args.host, args.port)
    print(f"Serving {ROOT} with cleanUrls at http://localhost:{args.port}/")
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
        threading.Event().wait()
    except KeyboardInterrupt:
        print("\nStopped.")
        for server in servers:
            server.shutdown()


if __name__ == "__main__":
    main()
