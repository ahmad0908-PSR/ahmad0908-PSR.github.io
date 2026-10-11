"""
Local preview server for the site, WITHOUT browser caching.

    python tools/serve.py          ->  http://localhost:8000
    python tools/serve.py 5500     ->  http://localhost:5500

Python's built-in `python -m http.server` lets the browser keep old copies
of the JavaScript and CSS files, so after an edit you can still see the
previous version until you force a reload. This server tells the browser to
always fetch fresh files, so every normal reload shows your latest changes.
(Only for testing on your computer: GitHub Pages handles caching itself.)
"""

import functools
import http.server
import sys
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parent.parent


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(NoCacheHandler, directory=str(SITE_ROOT))
    with http.server.ThreadingHTTPServer(("", port), handler) as server:
        print(f"Serving {SITE_ROOT} at http://localhost:{port}  (Ctrl+C to stop)")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
