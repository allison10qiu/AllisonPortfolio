#!/usr/bin/env python3
"""Local static server with Vercel-like cleanUrls for this portfolio."""

from __future__ import annotations

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]


class CleanUrlHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # Always fresh assets while designing locally
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def do_GET(self):  # noqa: N802
        parsed = urlsplit(self.path)
        path = unquote(parsed.path)
        query = f"?{parsed.query}" if parsed.query else ""
        fragment_safe = path  # fragment never reaches the server

        # Keep drafts offline (case-study backups, etc.)
        if path == "/drafts" or path.startswith("/drafts/"):
            self.send_error(404, "Not Found")
            return

        # /index.html → /
        if path == "/index.html":
            self.send_response(301)
            self.send_header("Location", "/" + query)
            self.end_headers()
            return

        # /about.html → /about (and same for nested pages)
        if path.endswith(".html") and path != "/index.html":
            clean = path[: -len(".html")]
            self.send_response(301)
            self.send_header("Location", clean + query)
            self.end_headers()
            return

        # /about → about.html ; /projects/nabu → projects/nabu.html
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
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
