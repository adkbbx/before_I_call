"""Temporary loopback-only form for loading a private env file into the browser.

This avoids displaying credentials in tool output. Stop the server after transfer.
"""
import argparse
import html
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from dotenv import dotenv_values


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime-env', type=Path, required=True)
    args = parser.parse_args()
    value = dotenv_values(args.runtime_env)['ANALYTICS_DATABASE_URL']
    page = ('<!doctype html><title>Private deployment transfer</title>'
            '<h1>Private deployment transfer</h1>'
            '<p>This page stays on this computer. Close it after deployment.</p>'
            '<label for="runtime">Runtime database URL</label>'
            '<input id="runtime" type="password" autocomplete="off" readonly value="' + html.escape(value, quote=True) + '">').encode()

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.headers.get('Host') != '127.0.0.1:8769' or self.path != '/':
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Frame-Options', 'DENY')
            self.end_headers()
            self.wfile.write(page)

        def log_message(self, *args):
            pass

    print('Private transfer form ready at http://127.0.0.1:8769/', flush=True)
    HTTPServer(('127.0.0.1', 8769), Handler).serve_forever()


if __name__ == '__main__':
    main()
