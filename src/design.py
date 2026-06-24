"""设计 Token 系统 · Design System Engine

从 OpenDesign 理念提炼: 结构化 Token 切换风格。
- 5 套精选设计系统 (Rose Pine / Nord / Tokyo Night / Paper / Forest)
- 排版: Major Third 模块化比例 (12→80px)
- 间距: 严格的 8px 基础网格
- 颜色: 语义化别名 (paper/ink/accent/grey 梯度)

用法:
  from src.design import SYSTEMS, get
  ds = get("rose-pine")
  ds.color.paper   →  '#191724'
  ds.type.size.h2  →  '48px'
"""

from dataclasses import dataclass, field
from typing import Optional

# ═══════════════════════════════════════════
# Token 数据结构
# ═══════════════════════════════════════════

@dataclass
class ColorTokens:
    paper: str          # 底色
    paper_rgb: str      # RGB 格式
    ink: str            # 主文字色
    ink_rgb: str
    grey_1: str         # 碳灰底
    grey_2: str         # 中灰分割线
    grey_3: str         # 暗灰辅助文字
    accent: str         # 高亮色
    accent_rgb: str
    accent_on: str      # accent 上的反色文字
    accent_bright: str  # 暗底提亮版
    # 语义化别名 (Carbon-style)
    text_primary: str = ""
    text_secondary: str = ""
    text_helper: str = ""
    text_placeholder: str = ""
    border_subtle: str = ""
    border_strong: str = ""

    def __post_init__(self):
        if not self.text_primary: self.text_primary = self.ink
        if not self.text_secondary: self.text_secondary = self.grey_3
        if not self.text_helper: self.text_helper = self.grey_3
        if not self.text_placeholder: self.text_placeholder = self.grey_2
        if not self.border_subtle: self.border_subtle = self.grey_2
        if not self.border_strong: self.border_strong = self.grey_1

    def to_css_vars(self) -> str:
        """生成 :root CSS 变量"""
        return f"""
    --paper:{self.paper};
    --paper-rgb:{self.paper_rgb};
    --ink:{self.ink};
    --ink-rgb:{self.ink_rgb};
    --grey-1:{self.grey_1};
    --grey-2:{self.grey_2};
    --grey-3:{self.grey_3};
    --accent:{self.accent};
    --accent-rgb:{self.accent_rgb};
    --accent-on:{self.accent_on};
    --accent-bright:{self.accent_bright};
    --text-primary:{self.text_primary};
    --text-secondary:{self.text_secondary};
    --text-helper:{self.text_helper};
    --text-placeholder:{self.text_placeholder};
    --border-subtle:{self.border_subtle};
    --border-strong:{self.border_strong};
"""


@dataclass
class TypeTokens:
    """排版 Token · Major Third 模块化比例"""
    family_heading: str = "Inter, system-ui, sans-serif"
    family_body: str = "Inter, 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif"
    family_mono: str = "'JetBrains Mono', 'SF Mono', monospace"
    # Major Third 比例: 12→16→20→24→32→40→48→64→80
    size_xs: str = "12px"
    size_sm: str = "14px"
    size_base: str = "16px"
    size_md: str = "20px"
    size_lg: str = "24px"
    size_xl: str = "32px"
    size_2xl: str = "40px"
    size_3xl: str = "48px"
    size_4xl: str = "64px"
    size_5xl: str = "80px"
    weight_light: str = "300"
    weight_normal: str = "400"
    weight_medium: str = "500"
    weight_semibold: str = "600"
    weight_bold: str = "700"
    line_height_tight: str = "1.1"
    line_height_normal: str = "1.5"
    line_height_loose: str = "1.75"


@dataclass
class SpacingTokens:
    """间距 Token · 严格的 8px 基础网格"""
    unit: int = 8
    xs: str = "4px"
    sm: str = "8px"
    md: str = "16px"
    lg: str = "24px"
    xl: str = "32px"
    xxl: str = "48px"
    xxxl: str = "64px"
    section: str = "80px"


@dataclass
class LayoutTokens:
    """布局 Token"""
    max_width: str = "1200px"
    narrow: str = "780px"
    grid_cols: int = 12
    sidebar: str = "170px"
    inspector: str = "260px"


@dataclass
class DesignSystem:
    """完整的设计系统"""
    key: str
    name: str
    description: str
    color: ColorTokens
    type: TypeTokens = field(default_factory=TypeTokens)
    spacing: SpacingTokens = field(default_factory=SpacingTokens)
    layout: LayoutTokens = field(default_factory=LayoutTokens)


# ═══════════════════════════════════════════
# 5 套精选设计系统
# ═══════════════════════════════════════════

SYSTEMS: dict[str, DesignSystem] = {}


def _hex_to_rgb(h: str) -> str:
    h = h.lstrip("#")
    return ",".join(str(int(h[i:i+2], 16)) for i in (0, 2, 4))


def _reg(system: DesignSystem):
    SYSTEMS[system.key] = system


# ── Rose Pine · 柔美优雅 ──
_reg(DesignSystem(
    key="rose-pine",
    name="Rose Pine",
    description="柔美、温暖、有质感。适合人文/艺术/生活类演讲。底色偏暖灰，玫瑰金色高亮。",
    color=ColorTokens(
        paper="#191724", paper_rgb=_hex_to_rgb("#191724"),
        ink="#e0def4", ink_rgb=_hex_to_rgb("#e0def4"),
        grey_1="#1f1d2e", grey_2="#26233a", grey_3="#6e6a86",
        accent="#ebbcba", accent_rgb=_hex_to_rgb("#ebbcba"),
        accent_on="#191724", accent_bright="#f6c177",
    ),
))

# ── Nord · 冷静专业 ──
_reg(DesignSystem(
    key="nord",
    name="Nord",
    description="冷静、克制、专业。适合学术/技术/商务演讲。蓝灰色调，冰蓝高亮。",
    color=ColorTokens(
        paper="#2e3440", paper_rgb=_hex_to_rgb("#2e3440"),
        ink="#eceff4", ink_rgb=_hex_to_rgb("#eceff4"),
        grey_1="#3b4252", grey_2="#434c5e", grey_3="#616e88",
        accent="#88c0d0", accent_rgb=_hex_to_rgb("#88c0d0"),
        accent_on="#2e3440", accent_bright="#8fbcbb",
    ),
))

# ── Tokyo Night · 赛博霓虹 ──
_reg(DesignSystem(
    key="tokyo-night",
    name="Tokyo Night",
    description="暗黑、锐利、科技感。适合科技/产品/AI 演讲。深紫黑底，霓虹蓝紫高亮。",
    color=ColorTokens(
        paper="#1a1b26", paper_rgb=_hex_to_rgb("#1a1b26"),
        ink="#c0caf5", ink_rgb=_hex_to_rgb("#c0caf5"),
        grey_1="#24283b", grey_2="#414868", grey_3="#565f89",
        accent="#7aa2f7", accent_rgb=_hex_to_rgb("#7aa2f7"),
        accent_on="#1a1b26", accent_bright="#bb9af7",
    ),
))

# ── Paper · 极简纸感 ──
_reg(DesignSystem(
    key="paper",
    name="Paper",
    description="极简、干净、像纸。适合学术报告/论文答辩。白底黑字，墨蓝点缀。",
    color=ColorTokens(
        paper="#fafaf8", paper_rgb=_hex_to_rgb("#fafaf8"),
        ink="#1a1a1a", ink_rgb=_hex_to_rgb("#1a1a1a"),
        grey_1="#f0f0ec", grey_2="#e0e0d8", grey_3="#8a8a80",
        accent="#1a56db", accent_rgb=_hex_to_rgb("#1a56db"),
        accent_on="#ffffff", accent_bright="#2563eb",
    ),
    type=TypeTokens(
        family_heading="'Playfair Display', 'Noto Serif SC', Georgia, serif",
        size_xl="32px", size_2xl="42px", size_3xl="56px", size_4xl="72px",
    ),
))

# ── Forest · 自然有机 ──
_reg(DesignSystem(
    key="forest",
    name="Forest",
    description="自然、有机、呼吸感。适合教育/公益/人文演讲。暖木色底，森绿高亮。",
    color=ColorTokens(
        paper="#1b1f1a", paper_rgb=_hex_to_rgb("#1b1f1a"),
        ink="#e2e8d5", ink_rgb=_hex_to_rgb("#e2e8d5"),
        grey_1="#252b22", grey_2="#3a4234", grey_3="#6b735e",
        accent="#a3be8c", accent_rgb=_hex_to_rgb("#a3be8c"),
        accent_on="#1b1f1a", accent_bright="#b9d992",
    ),
))


def get(key: str) -> Optional[DesignSystem]:
    """获取设计系统"""
    return SYSTEMS.get(key)


def list_all() -> list[DesignSystem]:
    """列出所有设计系统"""
    return list(SYSTEMS.values())


def get_css_for(key: str) -> str:
    """获取设计系统的 CSS 变量"""
    ds = SYSTEMS.get(key, SYSTEMS["tokyo-night"])
    return ds.color.to_css_vars()
