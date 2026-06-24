"""演示稿结构化构建器

从 JSON 规范生成 HTML Point 演示稿。
AI 只需描述内容 + 选布局，排版由模板引擎负责。
"""

import json
import re
from pathlib import Path
from .storage import save_file

ROOT = Path(__file__).resolve().parent.parent

# 布局目录: AI 可用的幻灯片布局
LAYOUT_CATALOG = {
    "hero": {
        "layout": "S01", "animate": "hero",
        "name": "封面",
        "description": "大标题 + 副标题 + 作者，适合第一页",
        "fields": ["title", "subtitle", "author", "date"],
    },
    "statement": {
        "layout": "S03", "animate": "statement",
        "name": "宣言页",
        "description": "左侧大标题 + 右侧说明文字，适合抛出核心观点",
        "fields": ["label", "title", "body"],
    },
    "progression": {
        "layout": "S02", "animate": "progression",
        "name": "时间线/进度",
        "description": "上方时间线 + 下方 KPI 数字，适合展示演进或里程碑",
        "fields": ["label", "title", "milestones"],
    },
    "grid": {
        "layout": "S05", "animate": "grid-reveal",
        "name": "网格卡片",
        "description": "2×N 卡片网格，适合并列展示多个要点",
        "fields": ["section", "items"],
    },
    "split": {
        "layout": "S08", "animate": "duo-mirror",
        "name": "左右对比",
        "description": "左文右图或左右对比，适合对比分析",
        "fields": ["left_title", "left_body", "right_title", "right_body"],
    },
    "closing": {
        "layout": "S10", "animate": "split-statement",
        "name": "结尾页·双栏",
        "description": "左栏感谢 + 右栏要点，适合最后一页",
        "fields": ["thank_title", "thank_sub", "summary_items"],
    },
    "manifesto": {
        "layout": "S12", "animate": "manifesto",
        "name": "宣言/愿景",
        "description": "全幅大字宣言 + 底部署名，适合愿景陈述",
        "fields": ["title", "body", "signature"],
    },
    "matrix": {
        "layout": "S15", "animate": "matrix-fill",
        "name": "矩阵/全景图",
        "description": "N×N 矩阵表格，适合产业全景或对比图表",
        "fields": ["title", "rows", "cols", "cells"],
    },
    "field": {
        "layout": "S16", "animate": "field-notes",
        "name": "领域笔记",
        "description": "卡片 + 要点布局，适合展开某个话题",
        "fields": ["label", "title", "points"],
    },
    "whynow": {
        "layout": "S18", "animate": "why-now",
        "name": "为什么是现在",
        "description": "3 个并列论点卡片，适合论证时机成熟",
        "fields": ["title", "reasons"],
    },
    "cards": {
        "layout": "S19", "animate": "four-cards",
        "name": "四卡片",
        "description": "4 张并列卡片，适合展示机会或方案",
        "fields": ["title", "cards"],
    },
}


def extract_layout_templates():
    """从 demo.html 提取每个布局的 HTML 模板"""
    demo = ROOT / "presentations" / "demo.html"
    if not demo.exists():
        return {}
    html = demo.read_text(encoding="utf-8")

    templates = {}
    seen = set()
    for m in re.finditer(
        r'<section[^>]*data-layout="(S\d+)"[^>]*data-animate="([^"]*)"[^>]*>(.*?)</section>',
        html, re.S,
    ):
        lid, anim = m.group(1), m.group(2)
        if lid in seen:
            continue
        seen.add(lid)
        section = m.group(0)
        cc = re.search(
            r'<div class="canvas-card"[^>]*>(.*)</div>\s*</div>\s*</section>',
            section, re.S,
        )
        if cc:
            templates[lid] = {
                "html": cc.group(0).rstrip("</div></section>").rstrip("</div>"),
                "animate": anim,
            }
    return templates


def build_presentation(spec_json: str, presentations_dir: Path, template_key="dark-tech"):
    """从 JSON 规范构建演示稿。

    spec_json 格式:
    {
      "title": "演讲标题",
      "template": "dark-tech",
      "slides": [
        {"layout": "hero", "title": "...", "subtitle": "...", "author": "...", "date": "..."},
        {"layout": "statement", "label": "PART 01", "title": "...", "body": "..."},
        {"layout": "grid", "section": "场景", "items": ["点1", "点2", "点3", "点4"]},
        {"layout": "closing", "thank_title": "感谢", "summary_items": ["要点1", "要点2", "要点3"]}
      ]
    }
    """
    spec = json.loads(spec_json) if isinstance(spec_json, str) else spec_json
    title = spec.get("title", "新演示稿")
    template_key = spec.get("template", template_key)
    slides_spec = spec.get("slides", [])

    # 从模板初始化
    from .template import BUILTIN_TEMPLATES, create_from_template

    demo = ROOT / "presentations" / "demo.html"
    if not demo.exists():
        demo = ROOT.parent / "2026机器人入职各行各业-演示.html"
    if not demo.exists():
        return {"ok": False, "error": "找不到模板文件"}

    tpl = BUILTIN_TEMPLATES.get(template_key, BUILTIN_TEMPLATES["dark-tech"])
    html = demo.read_text(encoding="utf-8")
    html = re.sub(r"<title>[^<]*</title>", f"<title>{title}</title>", html)
    for var, val in [
        ("--paper", tpl["paper"]),
        ("--ink", tpl["ink"]),
        ("--accent", tpl["accent"]),
    ]:
        html = re.sub(rf"{re.escape(var)}:#[0-9a-fA-F]{{6}}", f"{var}:{val}", html)

    # 提取第一个 layout 模板作为 section 容器
    first_section = re.search(
        r'<section[^>]*class="slide[^"]*"[^>]*>.*?</section>', html, re.S
    )
    if not first_section:
        return {"ok": False, "error": "模板无幻灯片"}

    slide_template = first_section.group(0)
    layout_templates = extract_layout_templates()

    # 构建所有幻灯片
    total = len(slides_spec)
    sections_html = []
    for i, s in enumerate(slides_spec):
        lname = s.get("layout", "statement")
        linfo = LAYOUT_CATALOG.get(lname, LAYOUT_CATALOG["statement"])
        lid = linfo["layout"]
        lt = layout_templates.get(lid, {})

        slide_html = lt.get("html", slide_template) if lt else slide_template

        # 替换占位内容
        page_num = f"{i+1:02d} / {total:02d}"
        slide_html = re.sub(r">\d{2} / \d{2}<", f">{page_num}<", slide_html)
        slide_html = re.sub(r'data-layout="[^"]*"', f'data-layout="{lid}"', slide_html)
        if lt:
            slide_html = re.sub(
                r'data-animate="[^"]*"', f'data-animate="{lt["animate"]}"', slide_html
            )

        # 按 layout 类型替换文本
        text = " ".join(str(v) for v in s.values() if isinstance(v, str))
        if lname == "hero":
            slide_html = simple_replace(slide_html, s)
        elif lname == "closing":
            slide_html = build_closing_slide(slide_html, s)
        elif lname == "grid" and "items" in s:
            slide_html = build_grid_slide(slide_html, s)
        else:
            slide_html = simple_replace(slide_html, s)

        sections_html.append(
            f'<section class="slide dark trans-fade" data-layout="{lid}" '
            f'data-animate="{lt.get("animate", "fade")}" '
            f'style="font-size:11px;color:#fff;background:#000;line-height:1.1">'
            f'\n  <div class="canvas-card">\n{slide_html}\n  </div>\n'
            f"</section>"
        )

    # 替换 deck 中的幻灯片
    old_sections = re.findall(
        r'<section[^>]*class="slide[^"]*"[^>]*>.*?</section>', html, re.S
    )
    if old_sections:
        first = old_sections[0]
        last = old_sections[-1]
        html = html[: html.find(first)] + "\n".join(sections_html) + html[html.find(last) + len(last):]

    name = title.replace(" ", "-").replace("/", "-") + ".html"
    result = save_file(presentations_dir, name, html)
    return result


def simple_replace(html, fields):
    """简单文本替换: 把 field value 填入第一个匹配的标题/段落"""
    for key, val in fields.items():
        if not isinstance(val, str) or len(val) < 2:
            continue
        # 替换第一个 h1/h2/span
        for tag in ["h1", "h2"]:
            pattern = rf"<{tag}[^>]*>.*?</{tag}>"
            m = re.search(pattern, html)
            if m:
                html = html[: m.start()] + f'<{tag} style="color:#fff">{val}</{tag}>' + html[m.end():]
                break
        else:
            # 替换第一个 span
            m = re.search(r"<span[^>]*>.*?</span>", html)
            if m:
                html = html[: m.start()] + f'<span style="color:rgba(255,255,255,.85)">{val}</span>' + html[m.end():]
    return html


def build_grid_slide(html, s):
    """构建网格卡片 slide"""
    items = s.get("items", [])
    section = s.get("section", "")
    # 替换 section 标签
    html = re.sub(r'(SCENE|场景)\s*[·•]\s*\w+', section, html, count=1)
    # 构建卡片
    cards = ""
    for i, item in enumerate(items):
        cards += (
            f'<div class="sub-card" style="padding:2vh 1.5vw">'
            f'<span style="color:var(--accent);font-weight:600">{i+1:02d}</span>'
            f'<p style="color:#fff;margin-top:1vh">{item}</p></div>\n'
        )
    # 替换第一个 sub-card 块
    first_card = re.search(r'<div class="sub-card"[^>]*>.*?</div>\s*</div>', html, re.S)
    if first_card and cards:
        html = html[: first_card.start()] + cards + html[first_card.end():]
    return html


def build_closing_slide(html, s):
    """构建结尾页"""
    items = s.get("summary_items", [])
    thank = s.get("thank_title", "感谢聆听")
    thank_sub = s.get("thank_sub", "")

    html = re.sub(r"(感谢聆听|THANK YOU)", thank, html, count=1)
    if thank_sub:
        html = re.sub(r"(欢迎交流|Welcome)", thank_sub, html, count=1)

    # 替换要点
    old_items = re.findall(
        r'<h3[^>]*>(.*?)</h3>\s*<p[^>]*>(.*?)</p>', html, re.S
    )
    for i, (_, _) in enumerate(old_items):
        if i < len(items):
            item = items[i]
            if isinstance(item, dict):
                html = re.sub(
                    rf"<h3[^>]*>.*?</h3>",
                    f'<h3 style="color:#fff">{item.get("title","")}</h3>',
                    html,
                    count=1,
                )
                html = re.sub(
                    rf"<p[^>]*>.*?</p>",
                    f'<p style="color:rgba(255,255,255,.7)">{item.get("desc","")}</p>',
                    html,
                    count=1,
                )
            else:
                html = re.sub(
                    rf"<h3[^>]*>.*?</h3>",
                    f'<h3 style="color:#fff">{item}</h3>',
                    html,
                    count=1,
                )
    return html
