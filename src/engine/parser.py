"""输入解析器：支持 JSON / YAML / Markdown"""

import json
import re
from pathlib import Path


def parse_json(text: str) -> dict:
    """解析 JSON 字符串"""
    return json.loads(text)


def parse_yaml(text: str) -> dict:
    """解析 YAML 字符串"""
    try:
        import yaml
        return yaml.safe_load(text)
    except ImportError:
        raise RuntimeError("解析 YAML 需要 PyYAML: pip install pyyaml")


def parse_markdown(text: str) -> dict:
    """将 Markdown 解析为幻灯片数据

    支持格式:
    ---
    title: 演示标题
    theme: dark-tech
    ---

    # 幻灯片 1
    ## 副标题
    内容段落...

    ---

    # 幻灯片 2
    ...
    """
    result = {"title": "Untitled", "theme": "dark-tech", "slides": []}

    # 提取 front matter
    front_matter_match = re.search(r'^---\s*\n(.*?)\n---\s*\n', text, re.DOTALL)
    if front_matter_match:
        fm_text = front_matter_match.group(1)
        try:
            import yaml
            fm = yaml.safe_load(fm_text)
            if isinstance(fm, dict):
                result.update(fm)
        except ImportError:
            # 简单解析 key: value
            for line in fm_text.strip().split('\n'):
                if ':' in line:
                    k, v = line.split(':', 1)
                    result[k.strip()] = v.strip().strip('"').strip("'")
        # 去掉 front matter
        text = text[front_matter_match.end():]

    # 按 --- 分割幻灯片
    slides_text = re.split(r'\n---\s*\n', text)

    for slide_text in slides_text:
        slide_text = slide_text.strip()
        if not slide_text:
            continue

        slide = {"layout": "title-content", "content": ""}
        lines = slide_text.split('\n')

        # 提取标题 (# 开头)
        title_lines = []
        content_lines = []
        in_title = True

        for line in lines:
            line = line.strip()
            if not line:
                continue
            if line.startswith('# ') and in_title:
                slide["title"] = line[2:].strip()
                in_title = False
            elif line.startswith('## ') and in_title:
                slide["subtitle"] = line[3:].strip()
                in_title = False
            elif line.startswith('!['):
                # 图片
                img_match = re.search(r'!\[(.*?)\]\((.*?)\)', line)
                if img_match:
                    slide.setdefault("images", []).append({
                        "type": "image",
                        "src": img_match.group(2),
                        "alt": img_match.group(1),
                    })
            elif line.startswith('> '):
                # 引用
                slide.setdefault("quotes", []).append(line[2:].strip())
            else:
                in_title = False
                content_lines.append(line)

        if content_lines:
            slide["content"] = '\n'.join(content_lines)

        # 根据内容推断布局
        if "images" in slide and len(slide.get("images", [])) > 0:
            if slide.get("title") and not slide.get("content"):
                slide["layout"] = "image-full"
            else:
                slide["layout"] = "image-left"
        elif slide.get("title") and not slide.get("content"):
            slide["layout"] = "title"
        elif "quotes" in slide:
            slide["layout"] = "quote"

        result["slides"].append(slide)

    return result


def parse_input(text: str, format_hint: str = None) -> dict:
    """根据格式提示自动解析输入"""
    if format_hint == "json":
        return parse_json(text)
    elif format_hint in ("yaml", "yml"):
        return parse_yaml(text)
    elif format_hint == "md":
        return parse_markdown(text)

    # 自动检测
    text_stripped = text.strip()
    if text_stripped.startswith('{'):
        return parse_json(text)
    elif text_stripped.startswith('---'):
        # 可能是 YAML front matter 或纯 YAML
        return parse_markdown(text)
    else:
        # 尝试 YAML
        try:
            return parse_yaml(text)
        except:
            # 回退到 Markdown
            return parse_markdown(text)
