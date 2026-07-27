#!/usr/bin/env python3
"""Tiny static server that sends no-store headers, so a data rebuild is never
served from a stale browser cache. Used by .claude/launch.json for the preview,
and by the "Run Conscious Consuming" launcher (which passes --open to pop a browser
once the server is bound -- race-free).

If the requested port is already in use (e.g. a dev preview is running, or you
launched twice), it steps to the next free port instead of colliding -- and opens
the browser at whatever port it actually got.

Run: python serve.py [port] [--open]   (serves this folder, default port 8850)
For real deployment use any static host -- this is only a local convenience.
"""
import http.server, socketserver, os, sys, socket

_args = sys.argv[1:]
OPEN = '--open' in _args
STRICT = '--strict' in _args   # preview harness: bind the exact port or fail — never silently step (a mismatch hangs the browser)
# --root DIR serves a different folder (e.g. the repo root, so the home page, /app/, and cross-instance links all resolve)
ROOT = None
if '--root' in _args:
    _i = _args.index('--root')
    if _i + 1 < len(_args):
        ROOT = _args[_i + 1]
        _args = _args[:_i] + _args[_i + 2:]
os.chdir(ROOT if ROOT else os.path.dirname(os.path.abspath(__file__)))
_ports = [a for a in _args if not a.startswith('-')]
PORT = int(_ports[0]) if _ports else int(os.environ.get('PORT') or 8850)


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def log_message(self, *a):
        pass  # keep the launcher console quiet


def _in_use(p):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.settimeout(0.25)
    try:
        s.connect(('127.0.0.1', p)); return True   # something is already listening here
    except OSError:
        return False
    finally:
        s.close()


# step past any port that already has a live server (Windows SO_REUSEADDR would otherwise let two
# servers silently share one port -> empty/blank responses). Probe before binding.
_base = PORT
if STRICT:
    if _in_use(PORT):
        print(f'Port {PORT} is in use and --strict is set; refusing to step (the preview needs this exact port).')
        sys.exit(1)
else:
    while _in_use(PORT) and PORT < _base + 20:
        PORT += 1

# Threaded, one request per thread: a browser opens many parallel connections, and a single-threaded
# server stalls all of them the moment one connection is slow or held open — which looks exactly like a
# hung preview. ThreadingHTTPServer already sets allow_reuse_address + daemon threads (clean Ctrl+C).
with http.server.ThreadingHTTPServer(('', PORT), Handler) as httpd:
    url = f'http://localhost:{PORT}/'
    note = '' if PORT == _base else f'  (port {_base} was busy)'
    print(f'Serving {os.getcwd()} on {url}  (no-store - always the latest build){note}')
    if OPEN:
        try:
            import webbrowser
            webbrowser.open(url)
        except Exception:
            pass
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped. You can close this window.')
