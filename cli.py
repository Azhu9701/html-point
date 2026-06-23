#!/usr/bin/env python3
"""
HTML Point CLI — 命令行接口

用法:
  html-point init [name] [--theme=THEME]          初始化新演示稿
  html-point build <file.json|yaml|md>             从数据文件构建 HTML 幻灯片
  html-point serve [--port=3099] [--open]          启动编辑服务器
  html-point convert <input.pptx|md> [--out=DIR]   转换外部格式为 HTML
  html-point export <file.html> --format=pdf|png|pptx [--out=FILE]
  html-point theme list                             列出所有主题
  html-point theme apply <theme> <file.html>       应用主题到演示稿
  html-point template list                          列出所有布局模板
  html-point validate <file.html>                   验证演示稿格式

环境变量:
  HTMLPOINT_PORT    默认服务端口
  HTMLPOINT_DIR     默认演示文稿目录
"""

import argparse
import json
import os
import sys
import textwrap
from pathlib import Path

# 将 src 加入路径
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

from engine.builder import SlideBuilder
from engine.parser import parse_input
from engine.theme import ThemeManager
from engine.layout import LayoutManager
from engine.export import ExportManager
from cli.commands import (
    cmd_init, cmd_build, cmd_serve, cmd_convert,
    cmd_export, cmd_theme, cmd_template, cmd_validate
)
from cli.utils import print_error, print_success, print_info


VERSION = "3.0.0"


def main():
    parser = argparse.ArgumentParser(
        prog="html-point",
        description="HTML Point — 开源 Keynote 替代 · CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            示例:
              html-point init my-presentation --theme=dark-tech
              html-point build slides.json --out=output.html
              html-point serve --port 3099
              html-point export presentation.html --format=pdf
        """),
    )
    parser.add_argument("-v", "--version", action="version", version=f"%(prog)s {VERSION}")
    parser.add_argument("--dir", default=os.environ.get("HTMLPOINT_DIR", "presentations"), help="演示文稿目录")
    parser.add_argument("--verbose", "-V", action="store_true", help="详细输出")

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # ── init ──
    p_init = subparsers.add_parser("init", help="初始化新演示稿")
    p_init.add_argument("name", nargs="?", default="untitled", help="演示稿名称")
    p_init.add_argument("--theme", "-t", default="dark-tech", help="主题 (默认: dark-tech)")
    p_init.add_argument("--layout", "-l", default="title", help="初始布局 (默认: title)")
    p_init.add_argument("--slides", "-s", type=int, default=5, help="初始幻灯片数量 (默认: 5)")
    p_init.add_argument("--out", "-o", help="输出路径 (默认: {name}.html)")

    # ── build ──
    p_build = subparsers.add_parser("build", help="从数据文件构建 HTML 幻灯片")
    p_build.add_argument("input", help="输入文件 (JSON/YAML/Markdown)")
    p_build.add_argument("--out", "-o", required=True, help="输出 HTML 文件路径")
    p_build.add_argument("--theme", "-t", default="dark-tech", help="主题")
    p_build.add_argument("--watch", "-w", action="store_true", help="监听文件变化并自动重建")

    # ── serve ──
    p_serve = subparsers.add_parser("serve", help="启动编辑服务器")
    p_serve.add_argument("--port", "-p", type=int, default=int(os.environ.get("HTMLPOINT_PORT", 3099)), help="端口")
    p_serve.add_argument("--open", action="store_true", help="自动打开浏览器")
    p_serve.add_argument("--no-browser", action="store_true", help="不自动打开浏览器")

    # ── convert ──
    p_convert = subparsers.add_parser("convert", help="转换外部格式")
    p_convert.add_argument("input", help="输入文件 (PPTX/Markdown/MD)")
    p_convert.add_argument("--out", "-o", help="输出目录")
    p_convert.add_argument("--theme", "-t", default="dark-tech", help="主题")

    # ── export ──
    p_export = subparsers.add_parser("export", help="导出演示稿")
    p_export.add_argument("input", help="输入 HTML 文件")
    p_export.add_argument("--format", "-f", required=True, choices=["pdf", "png", "pptx", "html-zip"], help="导出格式")
    p_export.add_argument("--out", "-o", help="输出文件路径")
    p_export.add_argument("--width", type=int, default=1920, help="导出宽度")
    p_export.add_argument("--height", type=int, default=1080, help="导出高度")
    p_export.add_argument("--all-pages", action="store_true", help="导出所有页面 (PNG)")

    # ── theme ──
    p_theme = subparsers.add_parser("theme", help="主题管理")
    p_theme_sub = p_theme.add_subparsers(dest="theme_cmd", help="主题子命令")
    p_theme_sub.add_parser("list", help="列出所有主题")
    p_theme_apply = p_theme_sub.add_parser("apply", help="应用主题到演示稿")
    p_theme_apply.add_argument("theme", help="主题名称")
    p_theme_apply.add_argument("file", help="演示稿文件")
    p_theme_apply.add_argument("--out", "-o", help="输出路径 (默认覆盖原文件)")

    # ── template ──
    p_template = subparsers.add_parser("template", help="布局模板管理")
    p_template_sub = p_template.add_subparsers(dest="template_cmd", help="模板子命令")
    p_template_sub.add_parser("list", help="列出所有布局模板")
    p_template_info = p_template_sub.add_parser("info", help="查看模板详情")
    p_template_info.add_argument("name", help="模板名称")

    # ── validate ──
    p_validate = subparsers.add_parser("validate", help="验证演示稿格式")
    p_validate.add_argument("file", help="HTML 演示稿文件")
    p_validate.add_argument("--json", action="store_true", help="JSON 格式输出")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    # 分发命令
    commands = {
        "init": cmd_init,
        "build": cmd_build,
        "serve": cmd_serve,
        "convert": cmd_convert,
        "export": cmd_export,
        "theme": cmd_theme,
        "template": cmd_template,
        "validate": cmd_validate,
    }

    try:
        handler = commands.get(args.command)
        if handler:
            result = handler(args)
            if result and not result.get("ok", True):
                print_error(result.get("error", "未知错误"))
                sys.exit(1)
        else:
            print_error(f"未知命令: {args.command}")
            sys.exit(1)
    except KeyboardInterrupt:
        print_info("\n已取消")
        sys.exit(0)
    except Exception as e:
        if args.verbose:
            import traceback
            traceback.print_exc()
        print_error(str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
