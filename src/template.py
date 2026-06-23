"""模板系统: 内置模板管理 + 从模板新建演示稿"""

import re
from pathlib import Path
from . import storage

BUILTIN_TEMPLATES = {
    "dark-tech": {
        "name": "深色科技（默认）",
        "description": "深空黑底 + 橙色高亮，适合科技/产品/路演",
        "accent": "#ff6b35", "paper": "#0a0a0a", "ink": "#ffffff",
    },
    "light-minimal": {
        "name": "极简白",
        "description": "纯白底 + 蓝色点缀，适合学术/汇报",
        "accent": "#0f4c81", "paper": "#ffffff", "ink": "#1a1a1a",
    },
    "gradient-purple": {
        "name": "渐变紫",
        "description": "深紫底 + 金色点缀，适合创意/品牌",
        "accent": "#f5a623", "paper": "#1a0a2e", "ink": "#f0e6ff",
    },
}


def get_all() -> list[dict]:
    """返回所有内置模板的摘要信息 (用于首页渲染)"""
    return [
        {
            "key": k,
            "name": v["name"],
            "desc": v["description"],
            "colors": [v["paper"], v["accent"], v["ink"]],
        }
        for k, v in BUILTIN_TEMPLATES.items()
    ]


def create_from_template(
    template_key: str,
    presentations_dir: Path,
    demo_path: str,
) -> dict:
    """
    从内置模板新建演示稿。
    返回 {ok, name} 或 {ok: False, error}
    """
    tpl = BUILTIN_TEMPLATES.get(template_key)
    if not tpl:
        return {"ok": False, "error": f"未知模板: {template_key}"}

    # 以 demo.html 为骨架, 替换配色变量
    demo_file = Path(demo_path)
    if not demo_file.exists():
        return {"ok": False, "error": "demo 文件不可用"}
    html = demo_file.read_text(encoding="utf-8")

    # 替换主题变量
    for var, val in [
        ("--paper", tpl["paper"]),
        ("--ink", tpl["ink"]),
        ("--accent", tpl["accent"]),
    ]:
        html = re.sub(rf"{re.escape(var)}:#[0-9a-fA-F]{{6}}", f"{var}:{val}", html)
    # 替换 rgb 版本
    def hex_to_rgb(h):
        h = h.lstrip("#")
        return ",".join(str(int(h[i:i+2], 16)) for i in (0, 2, 4))
    html = re.sub(r"--paper-rgb:\d+,\d+,\d+", f"--paper-rgb:{hex_to_rgb(tpl['paper'])}", html)
    html = re.sub(r"--ink-rgb:\d+,\d+,\d+", f"--ink-rgb:{hex_to_rgb(tpl['ink'])}", html)
    html = re.sub(r"--accent-rgb:\d+,\d+,\d+", f"--accent-rgb:{hex_to_rgb(tpl['accent'])}", html)
    html = re.sub(r"<title>[^<]*</title>", f"<title>新演示稿 - {tpl['name']}</title>", html)

    # 存到 presentations/
    file_name = f"新演示稿-{template_key}.html"
    result = storage.save_file(presentations_dir, file_name, html)
    return result
