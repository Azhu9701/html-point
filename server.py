#!/usr/bin/env python3
"""
HTML Point — 开源 Keynote 替代
启动: python3 server.py  →  http://localhost:3099
"""

import socketserver
from pathlib import Path
from src.app import Handler, PRESENTATIONS, DEMO_SRC
from src.storage import copy_demo

PORT = int(__import__("os").environ.get("HTML_POINT_PORT", "3099"))


def main():
    PRESENTATIONS.mkdir(exist_ok=True)
    copy_demo(DEMO_SRC.resolve(), PRESENTATIONS)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"\n  ◈  HTML Point v2 已启动")
        print(f"  📂 文稿: {PRESENTATIONS}")
        print(f"  🌐 http://localhost:{PORT}")
        print(f"  ⌨️  Ctrl+S 保存 | Ctrl+Z 撤销\n")
        import subprocess
        subprocess.Popen(["open", f"http://localhost:{PORT}"])
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  已停止")


if __name__ == "__main__":
    main()
