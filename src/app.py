"""HTML Point 应用路由 + HTTP Handler"""

import json
import os
import urllib.parse
import http.server
from pathlib import Path
from . import storage, template, security, editor_injector

ROOT = Path(__file__).resolve().parent.parent
PRESENTATIONS = ROOT / "presentations"
TEMPLATES_DIR = ROOT / "templates"
WEB_DIR = ROOT / "web"
EDITOR_JS = WEB_DIR / "editor.js"
CORE_JS = WEB_DIR / "core.js"
PRESENTER_JS = WEB_DIR / "presenter.js"
INDEX_HTML = WEB_DIR / "index.html"
DEMO_SRC = ROOT.parent / "2026机器人入职各行各业-演示.html"


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    # ── 响应工具 ──────────────────────────────────
    def _send(self, code, body=b"", ctype="text/html; charset=utf-8"):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json(self, data, code=200):
        self._send(code, json.dumps(data, ensure_ascii=False), "application/json")

    def _redirect(self, location, code=302):
        self.send_response(code)
        self.send_header("Location", location)
        self.end_headers()

    # ── GET 路由 ──────────────────────────────────
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        # 首页
        if path in ("/", "/index.html"):
            html = INDEX_HTML.read_text(encoding="utf-8") if INDEX_HTML.exists() else "<h1>HTML Point</h1>"
            # 注入模板列表 JSON
            tpls = template.get_all()
            html = html.replace(
                "TEMPLATES_DATA__",
                json.dumps(tpls, ensure_ascii=False)
            )
            return self._send(200, html)

        # 文件列表 API
        if path == "/api/list":
            return self._json({"files": storage.list_files(PRESENTATIONS)})

        # 编辑模式
        if path == "/edit":
            file_name = params.get("file", [None])[0]
            tpl_key = params.get("template", [None])[0]

            # 从模板新建
            if tpl_key:
                result = template.create_from_template(
                    tpl_key, PRESENTATIONS, str(DEMO_SRC.resolve())
                )
                if not result["ok"]:
                    return self._send(400, result["error"])
                return self._redirect(f"/edit?file={urllib.parse.quote(result['name'])}")

            # 打开已有文件
            if file_name:
                dest, err = security.safe_join(PRESENTATIONS, file_name)
                if err:
                    return self._send(400, err)
                if not dest.exists():
                    return self._send(404, f"文件 {file_name} 不存在")

                html = dest.read_text(encoding="utf-8")
                # 白名单净化: 保留演示稿内部脚本(导航/动画/背景), 删旧编辑器+外部风险
                html = security.strip_scripts_whitelist(html)
                # 注入 core.js (公共导航+动画 fallback) + 编辑器
                if CORE_JS.exists():
                    html = editor_injector.inject(html, str(CORE_JS), marker="ppt-core")
                html = editor_injector.inject(html, str(EDITOR_JS), marker="ppt-editor")
                return self._send(200, html)

            return self._send(400, "缺少 file 或 template 参数")

        # 演示模式 (只读)
        if path == "/view":
            file_name = params.get("file", [None])[0]
            if not file_name:
                return self._send(400, "缺少 file 参数")
            dest, err = security.safe_join(PRESENTATIONS, file_name)
            if err or not dest.exists():
                return self._send(404, "文件不存在")

            html = dest.read_text(encoding="utf-8")
            # 白名单净化: 保留演示稿内部脚本(导航/动画/背景), 删旧编辑器+外部风险
            html = security.strip_scripts_whitelist(html)
            # 注入隐藏编辑器 UI 的样式
            hide_css = "<style>#ppt-editor-bar,#ppt-sidebar,#ppt-inspector,#ppt-zoom-bar,#ppt-toast,.ppt-page-controls,.ppt-drag-handle,#ppt-bar,#ppt-sb,#ppt-in,#ppt-gd,#ppt-zm,#ppt-to{display:none!important} body.ppt-editing .slide{padding-left:5vw!important;padding-right:5vw!important} body.ppt-editing .canvas-card{margin-left:0!important;width:100vw!important}</style>"
            html = html.replace("</head>", hide_css + "</head>", 1)
            # 注入 core.js (公共导航+动画 fallback) + 演示增强
            if CORE_JS.exists():
                html = editor_injector.inject(html, str(CORE_JS), marker="ppt-core")
            if PRESENTER_JS.exists():
                html = editor_injector.inject(html, str(PRESENTER_JS), marker="ppt-presenter")
            return self._send(200, html)

        # 静态文件 (安全: 只允许 WEB_DIR 内的 .css/.js 文件)
        if path.startswith("/web/"):
            requested = os.path.basename(path)
            ext = os.path.splitext(requested)[1].lower()
            if ext not in (".css", ".js"):
                return self._send(400, "不支持的文件类型")
            fp = (WEB_DIR / requested).resolve()
            try:
                fp.relative_to(WEB_DIR.resolve())
            except ValueError:
                return self._send(400, "路径被拒绝")
            if fp.exists() and fp.is_file():
                ct = "text/css" if ext == ".css" else "application/javascript"
                return self._send(200, fp.read_bytes(), ct)

        return self._send(404, "Not Found")

    # ── POST 路由 ──────────────────────────────────
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else b""

        # 保存
        if path == "/api/save":
            ct = self.headers.get("Content-Type", "")
            file_name = ""
            html = ""

            if "application/x-www-form-urlencoded" in ct:
                params = urllib.parse.parse_qs(body.decode("utf-8"))
                html = params.get("html", [""])[0]
                file_name = params.get("file", [""])[0]
            else:
                html = body.decode("utf-8")

            if not file_name:
                import re
                m = re.search(r"<title>([^<]+)</title>", html)
                file_name = (m.group(1).strip() if m else "untitled") + ".html"

            result = storage.save_file(PRESENTATIONS, file_name, html)
            return self._json(result)

        # 删除
        if path == "/api/delete":
            qs = urllib.parse.parse_qs(parsed.query)
            fn = qs.get("file", [None])[0]
            if not fn:
                return self._json({"ok": False, "error": "缺少 file"}, 400)
            result = storage.delete_file(PRESENTATIONS, fn)
            return self._json(result)

        # 上传
        if path == "/api/upload":
            ct = self.headers.get("Content-Type", "")
            if "multipart/form-data" not in ct:
                return self._json({"ok": False, "error": "需要 multipart"}, 400)

            # 简单 multipart 解析
            boundary = ct.split("boundary=")[1].encode()
            parts = body.split(b"--" + boundary)
            for part in parts:
                if b"filename=" in part:
                    header, content = part.split(b"\r\n\r\n", 1)
                    content = content.rsplit(b"\r\n", 1)[0]
                    import re as _re
                    m = _re.search(b'filename="([^"]+)"', header)
                    if m:
                        fn = m.group(1).decode()
                        result = storage.upload_file(PRESENTATIONS, fn, content)
                        return self._json(result)
            return self._json({"ok": False, "error": "未找到文件"}, 400)

        return self._json({"ok": False, "error": "Unknown API"}, 404)
