"""主题引擎"""

import re
from pathlib import Path
from typing import Optional


THEMES = {
    "dark-tech": {
        "name": "深色科技",
        "description": "深空黑底 + 橙色高亮，适合科技/产品/路演",
        "paper": "#0a0a0a",
        "ink": "#ffffff",
        "accent": "#FF6B35",
        "accent_on": "#ffffff",
        "accent_bright": "#FF8F5C",
        "grey_1": "#1a1a1a",
        "grey_2": "#333333",
        "grey_3": "#737373",
        "text_primary": "#ffffff",
        "text_secondary": "#b0b0b0",
        "text_helper": "#737373",
        "text_placeholder": "#525252",
        "border_subtle": "#333333",
        "border_strong": "#a3a3a3",
    },
    "light-minimal": {
        "name": "极简白",
        "description": "纯白底 + 蓝色点缀，适合学术/汇报",
        "paper": "#ffffff",
        "ink": "#1a1a1a",
        "accent": "#0f4c81",
        "accent_on": "#ffffff",
        "accent_bright": "#1a6db5",
        "grey_1": "#f5f5f5",
        "grey_2": "#e0e0e0",
        "grey_3": "#999999",
        "text_primary": "#1a1a1a",
        "text_secondary": "#555555",
        "text_helper": "#999999",
        "text_placeholder": "#cccccc",
        "border_subtle": "#e0e0e0",
        "border_strong": "#333333",
    },
    "gradient-purple": {
        "name": "渐变紫",
        "description": "深紫底 + 金色点缀，适合创意/品牌",
        "paper": "#1a0a2e",
        "ink": "#f0e6ff",
        "accent": "#f5a623",
        "accent_on": "#1a0a2e",
        "accent_bright": "#ffc107",
        "grey_1": "#2d1b4e",
        "grey_2": "#4a3b6e",
        "grey_3": "#8a7a9a",
        "text_primary": "#f0e6ff",
        "text_secondary": "#c8b8d8",
        "text_helper": "#8a7a9a",
        "text_placeholder": "#6a5a7a",
        "border_subtle": "#4a3b6e",
        "border_strong": "#8a7a9a",
    },
    "swiss-ikb": {
        "name": "瑞士 IKB",
        "description": "瑞士国际主义风格，克莱因蓝 + 柠檬黄",
        "paper": "#ffffff",
        "ink": "#000000",
        "accent": "#002fa7",
        "accent_on": "#ffffff",
        "accent_bright": "#0040d0",
        "grey_1": "#f0f0f0",
        "grey_2": "#d0d0d0",
        "grey_3": "#888888",
        "text_primary": "#000000",
        "text_secondary": "#333333",
        "text_helper": "#888888",
        "text_placeholder": "#bbbbbb",
        "border_subtle": "#d0d0d0",
        "border_strong": "#000000",
    },
    "forest-green": {
        "name": "森林绿",
        "description": "深绿底 + 米色文字，自然/环保风格",
        "paper": "#0f281e",
        "ink": "#e8e4d9",
        "accent": "#c8a456",
        "accent_on": "#0f281e",
        "accent_bright": "#d4b870",
        "grey_1": "#1a3d2e",
        "grey_2": "#2d5a45",
        "grey_3": "#6a8a75",
        "text_primary": "#e8e4d9",
        "text_secondary": "#b8b4a9",
        "text_helper": "#6a8a75",
        "text_placeholder": "#4a6a55",
        "border_subtle": "#2d5a45",
        "border_strong": "#6a8a75",
    },
    "warm-terracotta": {
        "name": "暖陶土",
        "description": "暖陶土色 + 奶油白，适合生活方式/设计",
        "paper": "#faf6f1",
        "ink": "#3d2b1f",
        "accent": "#c4703a",
        "accent_on": "#ffffff",
        "accent_bright": "#d48650",
        "grey_1": "#f0e8e0",
        "grey_2": "#d8ccc0",
        "grey_3": "#a89888",
        "text_primary": "#3d2b1f",
        "text_secondary": "#6a5a4a",
        "text_helper": "#a89888",
        "text_placeholder": "#c8b8a8",
        "border_subtle": "#d8ccc0",
        "border_strong": "#6a5a4a",
    },
    "midnight-blue": {
        "name": "午夜蓝",
        "description": "深蓝底 + 银白文字，商务/金融风格",
        "paper": "#0a1628",
        "ink": "#e0e6f0",
        "accent": "#4a90d9",
        "accent_on": "#ffffff",
        "accent_bright": "#6aa8e8",
        "grey_1": "#162036",
        "grey_2": "#2a3a52",
        "grey_3": "#6a7a92",
        "text_primary": "#e0e6f0",
        "text_secondary": "#a0aabc",
        "text_helper": "#6a7a92",
        "text_placeholder": "#4a5a72",
        "border_subtle": "#2a3a52",
        "border_strong": "#6a7a92",
    },
    "cherry-blossom": {
        "name": "樱花粉",
        "description": "粉白底 + 玫红点缀，适合女性/婚庆/时尚",
        "paper": "#fff5f7",
        "ink": "#2d1a1e",
        "accent": "#e84a7a",
        "accent_on": "#ffffff",
        "accent_bright": "#f06a8a",
        "grey_1": "#f0e5e8",
        "grey_2": "#d8ccd0",
        "grey_3": "#a8989c",
        "text_primary": "#2d1a1e",
        "text_secondary": "#6a5a5e",
        "text_helper": "#a8989c",
        "text_placeholder": "#c8b8bc",
        "border_subtle": "#d8ccd0",
        "border_strong": "#6a5a5e",
    },
    "monochrome": {
        "name": "单色灰",
        "description": "纯灰阶，极简/严肃/学术",
        "paper": "#fafafa",
        "ink": "#1a1a1a",
        "accent": "#333333",
        "accent_on": "#ffffff",
        "accent_bright": "#555555",
        "grey_1": "#f0f0f0",
        "grey_2": "#d0d0d0",
        "grey_3": "#888888",
        "text_primary": "#1a1a1a",
        "text_secondary": "#555555",
        "text_helper": "#888888",
        "text_placeholder": "#bbbbbb",
        "border_subtle": "#d0d0d0",
        "border_strong": "#333333",
    },
    "neon-cyber": {
        "name": "霓虹赛博",
        "description": "深黑底 + 霓虹绿/粉，赛博朋克风格",
        "paper": "#050505",
        "ink": "#e0e0e0",
        "accent": "#00ff88",
        "accent_on": "#000000",
        "accent_bright": "#33ffaa",
        "grey_1": "#111111",
        "grey_2": "#222222",
        "grey_3": "#555555",
        "text_primary": "#e0e0e0",
        "text_secondary": "#a0a0a0",
        "text_helper": "#555555",
        "text_placeholder": "#333333",
        "border_subtle": "#222222",
        "border_strong": "#00ff88",
    },
}


class ThemeManager:
    """主题管理器"""

    def __init__(self):
        self.themes = dict(THEMES)
        self._load_custom_themes()

    def _load_custom_themes(self):
        """从 themes/ 目录加载自定义主题"""
        themes_dir = Path(__file__).resolve().parent.parent.parent / "themes"
        if themes_dir.exists():
            for f in themes_dir.glob("*.yml"):
                try:
                    import yaml
                    data = yaml.safe_load(f.read_text(encoding="utf-8"))
                    if isinstance(data, dict):
                        key = f.stem
                        self.themes[key] = data
                except:
                    pass

    def list_themes(self) -> list[dict]:
        return [
            {
                "key": k,
                "name": v.get("name", k),
                "description": v.get("description", ""),
                "colors": [v.get("paper", "#000"), v.get("accent", "#fff"), v.get("ink", "#fff")],
            }
            for k, v in self.themes.items()
        ]

    def get_theme(self, key: str) -> Optional[dict]:
        return self.themes.get(key)

    def get_theme_css(self, key: str) -> str:
        """生成主题 CSS 变量"""
        theme = self.themes.get(key)
        if not theme:
            theme = THEMES["dark-tech"]

        paper_rgb = self._hex_to_rgb(theme["paper"])
        ink_rgb = self._hex_to_rgb(theme["ink"])
        accent_rgb = self._hex_to_rgb(theme["accent"])

        return f""":root{{
  --paper:{theme["paper"]};
  --paper-rgb:{paper_rgb};
  --ink:{theme["ink"]};
  --ink-rgb:{ink_rgb};
  --grey-1:{theme["grey_1"]};
  --grey-2:{theme["grey_2"]};
  --grey-3:{theme["grey_3"]};
  --accent:{theme["accent"]};
  --accent-rgb:{accent_rgb};
  --accent-on:{theme["accent_on"]};
  --accent-bright:{theme["accent_bright"]};
  --text-primary:{theme["text_primary"]};
  --text-secondary:{theme["text_secondary"]};
  --text-helper:{theme["text_helper"]};
  --text-placeholder:{theme["text_placeholder"]};
  --border-subtle:{theme["border_subtle"]};
  --border-strong:{theme["border_strong"]};
  --sans:"Inter","Helvetica Neue","Helvetica","Arial","Segoe UI Variable","Segoe UI",system-ui,-apple-system,sans-serif;
  --sans-zh:"PingFang SC","Hiragino Sans GB","Source Han Sans SC","Noto Sans SC","Microsoft YaHei UI","Microsoft YaHei","微软雅黑",sans-serif;
  --mono:"JetBrains Mono","IBM Plex Mono","SF Mono","Cascadia Code","Consolas","Courier New",ui-monospace,monospace;
}}"""

    def apply_theme(self, html: str, theme_key: str) -> str:
        """将主题应用到现有 HTML 文件"""
        theme_css = self.get_theme_css(theme_key)
        # 替换或注入 CSS 变量
        # 查找现有 :root 块并替换
        if ":root{" in html:
            html = re.sub(r':root\{[^}]*\}', theme_css.replace(':root{', '').replace('}', ''), html, count=1)
        else:
            # 在 <style> 中注入
            html = html.replace('<style>', f'<style>\n{theme_css}', 1)
        return html

    def _hex_to_rgb(self, hex_color: str) -> str:
        h = hex_color.lstrip('#')
        return ','.join(str(int(h[i:i+2], 16)) for i in (0, 2, 4))
