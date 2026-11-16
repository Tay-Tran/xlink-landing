"""Local preview server for the XLink landing page.

Same as `python -m http.server`, but tells the browser not to cache anything,
so every edit shows up on a normal reload.

Usage:  python serve.py [port]   (serves dist/)
"""
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    # serve the built site (run python -I cms/build_site.py first)
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist"))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler)
    print(f"Serving XLink landing at http://localhost:{port} (no-cache)")
    server.serve_forever()
