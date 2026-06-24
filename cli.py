#!/usr/bin/env python3
"""
HTML Point CLI — AI 可调用的演示稿命令行工具

用法:
  python3 cli.py list                              # 列出所有演示稿
  python3 cli.py info demo.html                    # 查看演示稿信息
  python3 cli.py new "我的演讲" -p 10              # 从模板新建
  python3 cli.py edit demo.html -s 3 -r "旧" "新"  # 替换文字
  python3 cli.py edit demo.html -s 5 -i "新页面"   # 插入页面
  python3 cli.py export demo.html --html --pptx    # 导出
"""

import sys
import argparse
import json
import re
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))


def presentations_dir():
    d = ROOT / "presentations"
    d.mkdir(exist_ok=True)
    return d


def list_files():
    files = sorted(
        presentations_dir().glob("*.html"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not files:
        print("📭 还没有演示稿, 用 'new' 命令创建一个吧")
        return []
    print(f"📂 演示稿 ({len(files)} 个)\n")
    for i, f in enumerate(files):
        st = f.stat()
        print(f"  {i+1}. {f.name}  |  {f.stat().st_size/1024:.0f} KB  |  "
              f"{datetime.fromtimestamp(st.st_mtime).strftime('%m-%d %H:%M')}")
    return files


def _extract_title(filepath):
    try:
        html = filepath.read_text(encoding="utf-8")
        m = re.search(r"<title>([^<]+)</title>", html)
        return m.group(1).strip() if m else ""
    except Exception:
        return ""


def info_file(filepath):
    p = presentations_dir() / filepath
    if not p.exists():
        p = Path(filepath)
    if not p.exists():
        print(f"✗ 文件不存在: {filepath}")
        return
    html = p.read_text(encoding="utf-8")
    slides = re.findall(
        r'<section[^>]*class="[^"]*slide[^"]*"[^>]*>(.*?)</section>', html, re.S
    )
    title = _extract_title(p)
    print(f"📄 {p.name}")
    print(f"   标题: {title or '(无)'}")
    print(f"   页码: {len(slides)} 页\n")
    for i, s in enumerate(slides):
        txt = re.sub(r"<[^>]+>", " ", s)
        txt = re.sub(r"\s+", " ", txt).strip()[:80]
        print(f"   [{i+1:02d}] {txt}...")


def _resolve_path(filepath):
    p = presentations_dir() / filepath
    if p.exists():
        return p
    p = Path(filepath)
    return p if p.exists() else None


# ── new ──

def cmd_new(title, pages=10, template="dark-tech"):
    from src.template import BUILTIN_TEMPLATES
    from src.storage import save_file

    if template not in BUILTIN_TEMPLATES:
        print(f"✗ 未知模板: {template}")
        return
    tpl = BUILTIN_TEMPLATES[template]

    demo = ROOT / "presentations" / "demo.html"
    if not demo.exists():
        demo = ROOT.parent / "2026机器人入职各行各业-演示.html"
    if not demo.exists():
        demos = list(presentations_dir().glob("*.html"))
        demo = demos[0] if demos else None
    if not demo:
        print("✗ 找不到模板骨架文件")
        return

    html = demo.read_text(encoding="utf-8")
    html = re.sub(r"<title>[^<]*</title>", f"<title>{title}</title>", html)
    for var, val in [("--paper", tpl["paper"]), ("--ink", tpl["ink"]), ("--accent", tpl["accent"])]:
        html = re.sub(rf"{re.escape(var)}:#[0-9a-fA-F]{{6}}", f"{var}:{val}", html)

    # 调整页数
    slides = list(re.finditer(r'<section[^>]*class="[^"]*slide[^"]*"[^>]*>', html))
    current = len(slides)
    if pages < current:
        for m in reversed(slides[pages:]):
            end = html.find("</section>", m.start())
            if end > 0:
                html = html[: m.start()] + html[end + 10 :]
    elif pages > current:
        last = slides[-1]
        end = html.find("</section>", last.start()) + 10
        template_slide = html[last.start() : end]
        for _ in range(pages - current):
            pos = html.rfind("</section>") + 10
            html = html[:pos] + "\n" + template_slide + html[pos:]

    html = re.sub(r">(\d+) / (\d+)<", lambda m: f">{m.group(1)} / {pages}<", html)
    name = title.replace(" ", "-").replace("/", "-") + ".html"
    result = save_file(presentations_dir(), name, html)
    if result["ok"]:
        print(f"✅ 已创建: {result['name']} ({pages} 页)")
    else:
        print(f"✗ {result.get('error')}")


# ── edit ──

def cmd_edit_replace(filepath, idx, old, new):
    p = _resolve_path(filepath)
    if not p:
        return print(f"✗ 文件不存在")
    html = p.read_text(encoding="utf-8")
    slides = list(re.finditer(r'<section[^>]*class="[^"]*slide[^"]*"[^>]*>.*?</section>', html, re.S))
    if idx < 0 or idx >= len(slides):
        return print(f"✗ 页码超出范围 (共 {len(slides)} 页)")
    slide_html = slides[idx].group(0)
    if old not in slide_html:
        return print(f"✗ 找不到 \"{old}\"")
    html = html[:slides[idx].start()] + slide_html.replace(old, new) + html[slides[idx].end():]
    p.write_text(html, encoding="utf-8")
    print(f"✅ 已替换")


def cmd_edit_insert(filepath, idx, text):
    p = _resolve_path(filepath)
    if not p:
        return print(f"✗ 文件不存在")
    html = p.read_text(encoding="utf-8")
    slides = list(re.finditer(r'<section[^>]*class="[^"]*slide[^"]*"[^>]*>.*?</section>', html, re.S))
    if idx < 0 or idx >= len(slides):
        return print(f"✗ 页码超出范围")
    ns = slides[idx].group(0)
    ns = re.sub(r"<h[1-6][^>]*>.*?</h[1-6]>", f'<h2 style="color:#fff">{text}</h2>', ns, count=1)
    html = html[:slides[idx].end()] + "\n" + ns + html[slides[idx].end():]
    html = re.sub(r">(\d+) / (\d+)<", lambda m: f">{m.group(1)} / {len(slides)+1}<", html)
    p.write_text(html, encoding="utf-8")
    print(f"✅ 已插入")


def cmd_edit_delete(filepath, idx):
    p = _resolve_path(filepath)
    if not p:
        return print(f"✗ 文件不存在")
    html = p.read_text(encoding="utf-8")
    slides = list(re.finditer(r'<section[^>]*class="[^"]*slide[^"]*"[^>]*>.*?</section>', html, re.S))
    if len(slides) <= 1:
        return print("✗ 至少保留一页")
    html = html[:slides[idx].start()] + html[slides[idx].end():]
    html = re.sub(r">(\d+) / (\d+)<", lambda m: f">{m.group(1)} / {len(slides)-1}<", html)
    p.write_text(html, encoding="utf-8")
    print(f"✅ 已删除")


# ── export ──

def cmd_export(filepath, out_dir, html_fmt=True, pptx_fmt=False):
    p = _resolve_path(filepath)
    if not p:
        return print(f"✗ 文件不存在")
    out = Path(out_dir) if out_dir else Path.home() / "Desktop"
    out.mkdir(parents=True, exist_ok=True)
    stem = p.stem

    if html_fmt:
        from src import security, editor_injector, storage
        h = p.read_text(encoding="utf-8")
        h = security.strip_scripts_whitelist(h)
        for js, mk in [(ROOT/"web/core.js","ppt-core"), (ROOT/"web/presenter.js","ppt-presenter")]:
            if js.exists():
                h = editor_injector.inject(h, str(js), marker=mk)
        h = h.replace("</head>",
            "<style>#ppt-bar,#ppt-sb,#ppt-in,#ppt-gd,#ppt-zm,#ppt-to,#ppt-notes-panel,"
            "#ppt-pres-bar,.pc,.dh,.ppt-page-controls,.ppt-drag-handle,#nav,#hint"
            "{display:none!important}"
            " body.pe .slide{padding-left:5vw!important;padding-right:5vw!important}"
            " body.pe .canvas-card{margin-left:0!important;width:100vw!important}</style></head>", 1)
        h = storage.embed_local_images(h)
        fout = out / f"{stem}.html"
        fout.write_text(h, encoding="utf-8")
        print(f"✅ HTML: {fout} ({fout.stat().st_size/1024:.0f} KB)")

    if pptx_fmt:
        from src.export_pptx import export_to_pptx
        fout = out / f"{stem}.pptx"
        export_to_pptx(p, fout)
        print(f"✅ PPTX: {fout} ({fout.stat().st_size/1024:.0f} KB)")


# ── build ──

def cmd_build(spec_file, design="tokyo-night"):
    """从 JSON 规范文件构建演示稿"""
    spec_path = Path(spec_file)
    if not spec_path.exists():
        print(f"✗ 规范文件不存在: {spec_file}")
        return
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    spec["design"] = spec.get("design", design)  # 命令行参数覆盖 JSON 中的设置
    from src.builder import build_presentation
    result = build_presentation(spec, presentations_dir(), design)
    if result.get("ok"):
        print(f"✅ 已构建: {result['name']} ({spec.get('design',design)})")
        print(f"   编辑: http://localhost:3099/edit?file={result['name']}")
    else:
        print(f"✗ {result.get('error', '失败')}")


# ── main ──

def main():
    parser = argparse.ArgumentParser(prog="html-point", description="HTML Point CLI")
    sub = parser.add_subparsers(dest="cmd")
    sub.add_parser("list", help="列出所有演示稿")
    sub.add_parser("layouts", help="列出可用幻灯片布局")
    sub.add_parser("designs", help="列出可用设计系统 (风格)")
    p = sub.add_parser("info", help="查看演示稿信息"); p.add_argument("file")
    p = sub.add_parser("new", help="新建演示稿"); p.add_argument("title"); p.add_argument("-p","--pages",type=int,default=10); p.add_argument("-t","--template",default="dark-tech")
    p = sub.add_parser("edit", help="编辑演示稿"); p.add_argument("file"); p.add_argument("-s","--slide",type=int,default=1); p.add_argument("-r","--replace",nargs=2); p.add_argument("-i","--insert"); p.add_argument("--delete",action="store_true")
    p = sub.add_parser("export", help="导出"); p.add_argument("file"); p.add_argument("-o","--output"); p.add_argument("--html",action="store_true",default=True); p.add_argument("--pptx",action="store_true")
    p = sub.add_parser("build", help="从 JSON 规范构建"); p.add_argument("spec"); p.add_argument("-d","--design",default="tokyo-night")

    args = parser.parse_args()
    if args.cmd == "list" or args.cmd is None: list_files()
    elif args.cmd == "layouts":
        from src.builder import LAYOUT_CATALOG
        print("📐 可用幻灯片布局\n")
        for k, v in LAYOUT_CATALOG.items():
            print(f"  {k:12s}  {v['name']}")
            print(f"             {v['desc']}")
            print(f"             字段: {', '.join(v['fields'])}")
            print()
    elif args.cmd == "designs":
        from src.design import list_all
        print("🎨 可用设计系统\n")
        for ds in list_all():
            print(f"  {ds.key:14s}  {ds.name}")
            print(f"                {ds.description}")
            print(f"                底色:{ds.color.paper}  文字:{ds.color.ink}  高亮:{ds.color.accent}")
            print()
    elif args.cmd == "info": info_file(args.file)
    elif args.cmd == "new": cmd_new(args.title, args.pages, args.template)
    elif args.cmd == "edit":
        if args.replace: cmd_edit_replace(args.file, args.slide-1, args.replace[0], args.replace[1])
        elif args.insert: cmd_edit_insert(args.file, args.slide-1, args.insert)
        elif args.delete: cmd_edit_delete(args.file, args.slide-1)
        else: print("请指定 --replace, --insert 或 --delete")
    elif args.cmd == "export": cmd_export(args.file, args.output, args.html, args.pptx)
    elif args.cmd == "build": cmd_build(args.spec, args.design)

if __name__ == "__main__":
    main()
