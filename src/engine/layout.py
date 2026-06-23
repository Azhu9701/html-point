"""布局系统：管理幻灯片布局模板"""

from pathlib import Path
from typing import Optional


LAYOUTS = {
    "title": {
        "name": "title",
        "description": "标题页：大标题 + 副标题",
        "tags": ["cover", "hero"],
        "template": """<section class="slide center">
<div class="frame center">
<div class="kicker" data-anim="kicker">{kicker}</div>
<h1 class="h-hero" data-anim="title">{title}</h1>
<p class="h-sub" data-anim="lead">{subtitle}</p>
<div class="meta" data-anim="line" style="margin-top:4vh">{meta}</div>
</div>
</section>""",
    },
    "title-content": {
        "name": "title-content",
        "description": "标题 + 内容页",
        "tags": ["content", "text"],
        "template": """<section class="slide">
<div class="frame">
<div class="kicker" data-anim="kicker">{kicker}</div>
<h1 class="h-xl" data-anim="title">{title}</h1>
<div class="lead" data-anim="lead">{content}</div>
</div>
</section>""",
    },
    "two-column": {
        "name": "two-column",
        "description": "两栏布局：左侧标题 + 右侧内容",
        "tags": ["content", "split"],
        "template": """<section class="slide">
<div class="frame grid-2" style="align-items:center">
<div class="col" data-anim="left">
<div class="kicker">{kicker}</div>
<h1 class="h-xl">{title}</h1>
<p class="h-sub">{subtitle}</p>
</div>
<div class="col" data-anim="right">
<div class="lead">{content}</div>
</div>
</div>
</section>""",
    },
    "three-column": {
        "name": "three-column",
        "description": "三栏卡片布局",
        "tags": ["grid", "cards"],
        "template": """<section class="slide">
<div class="frame">
<div class="kicker" data-anim="kicker">{kicker}</div>
<h1 class="h-xl" data-anim="title">{title}</h1>
<div class="grid-3" data-anim="up">
<div class="col">{col1}</div>
<div class="col">{col2}</div>
<div class="col">{col3}</div>
</div>
</div>
</section>""",
    },
    "image-left": {
        "name": "image-left",
        "description": "左侧图片 + 右侧文字",
        "tags": ["image", "split"],
        "template": """<section class="slide">
<div class="frame grid-2" style="align-items:center">
<div data-anim="left">{image}</div>
<div class="col" data-anim="right">
<div class="kicker">{kicker}</div>
<h1 class="h-xl">{title}</h1>
<div class="lead">{content}</div>
</div>
</div>
</section>""",
    },
    "image-right": {
        "name": "image-right",
        "description": "右侧图片 + 左侧文字",
        "tags": ["image", "split"],
        "template": """<section class="slide">
<div class="frame grid-2" style="align-items:center">
<div class="col" data-anim="left">
<div class="kicker">{kicker}</div>
<h1 class="h-xl">{title}</h1>
<div class="lead">{content}</div>
</div>
<div data-anim="right">{image}</div>
</div>
</section>""",
    },
    "image-full": {
        "name": "image-full",
        "description": "全屏图片 + 标题叠加",
        "tags": ["image", "cover", "hero"],
        "template": """<section class="slide" style="padding:0">
<div style="position:relative;width:100%;height:100%">
{image}
<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:5vh 5vw;background:linear-gradient(to top,rgba(0,0,0,.8),transparent)">
<div class="kicker" data-anim="kicker" style="color:#fff">{kicker}</div>
<h1 class="h-hero" data-anim="title" style="color:#fff">{title}</h1>
<p class="h-sub" data-anim="lead" style="color:#fff;opacity:.8">{subtitle}</p>
</div>
</div>
</section>""",
    },
    "comparison": {
        "name": "comparison",
        "description": "左右对比布局",
        "tags": ["compare", "split"],
        "template": """<section class="slide">
<div class="frame grid-2" style="align-items:start">
<div class="col" data-anim="left">
<div class="tag solid">{left_tag}</div>
<h2 class="h-md">{left_title}</h2>
<div class="lead">{left_content}</div>
</div>
<div class="col" data-anim="right">
<div class="tag solid accent">{right_tag}</div>
<h2 class="h-md">{right_title}</h2>
<div class="lead">{right_content}</div>
</div>
</div>
</section>""",
    },
    "kpi": {
        "name": "kpi",
        "description": "KPI 数据展示页",
        "tags": ["data", "numbers"],
        "template": """<section class="slide">
<div class="frame">
<div class="kicker" data-anim="kicker">{kicker}</div>
<h1 class="h-xl" data-anim="title">{title}</h1>
<div class="grid-4" data-anim="up">
<div class="stat-card">{kpi1}</div>
<div class="stat-card">{kpi2}</div>
<div class="stat-card">{kpi3}</div>
<div class="stat-card">{kpi4}</div>
</div>
</div>
</section>""",
    },
    "chart": {
        "name": "chart",
        "description": "图表页（柱状图）",
        "tags": ["data", "chart"],
        "template": """<section class="slide">
<div class="frame">
<div class="kicker" data-anim="kicker">{kicker}</div>
<h1 class="h-xl" data-anim="title">{title}</h1>
<div data-anim="up">{chart}</div>
</div>
</section>""",
    },
    "table": {
        "name": "table",
        "description": "表格页",
        "tags": ["data", "table"],
        "template": """<section class="slide">
<div class="frame">
<div class="kicker" data-anim="kicker">{kicker}</div>
<h1 class="h-xl" data-anim="title">{title}</h1>
<div data-anim="up">{table}</div>
</div>
</section>""",
    },
    "code": {
        "name": "code",
        "description": "代码展示页",
        "tags": ["code", "tech"],
        "template": """<section class="slide">
<div class="frame">
<div class="kicker" data-anim="kicker">{kicker}</div>
<h1 class="h-xl" data-anim="title">{title}</h1>
<div data-anim="up">{code}</div>
</div>
</section>""",
    },
    "quote": {
        "name": "quote",
        "description": "引用页",
        "tags": ["quote", "text"],
        "template": """<section class="slide center">
<div class="frame center" style="max-width:70vw">
<div class="hp-quote" data-anim="fadeInUp">
<p class="h-xl" style="font-size:4vw">{quote}</p>
<cite>{author}</cite>
</div>
</div>
</section>""",
    },
    "video": {
        "name": "video",
        "description": "视频嵌入页",
        "tags": ["media", "video"],
        "template": """<section class="slide">
<div class="frame center">
<div class="kicker" data-anim="kicker">{kicker}</div>
<h1 class="h-xl" data-anim="title">{title}</h1>
<div data-anim="zoomIn">{video}</div>
</div>
</section>""",
    },
    "timeline": {
        "name": "timeline",
        "description": "时间线页",
        "tags": ["timeline", "process"],
        "template": """<section class="slide">
<div class="frame">
<div class="kicker" data-anim="kicker">{kicker}</div>
<h1 class="h-xl" data-anim="title">{title}</h1>
<div class="timeline-v" data-anim="up">{timeline}</div>
</div>
</section>""",
    },
    "blank": {
        "name": "blank",
        "description": "空白页（自由布局）",
        "tags": ["blank", "custom"],
        "template": """<section class="slide">
<div class="frame">
{content}
</div>
</section>""",
    },
}


class LayoutManager:
    """布局管理器"""

    def __init__(self):
        self.layouts = dict(LAYOUTS)
        self._load_custom_layouts()

    def _load_custom_layouts(self):
        """从 layouts/ 目录加载自定义布局"""
        layouts_dir = Path(__file__).resolve().parent.parent.parent / "layouts"
        if layouts_dir.exists():
            for f in layouts_dir.glob("*.html"):
                key = f.stem
                self.layouts[key] = {
                    "name": key,
                    "description": f"自定义布局: {key}",
                    "tags": ["custom"],
                    "template": f.read_text(encoding="utf-8"),
                }

    def get_layout(self, name: str) -> Optional[dict]:
        return self.layouts.get(name)

    def list_layouts(self) -> list[dict]:
        return [
            {
                "name": v["name"],
                "description": v["description"],
                "tags": v.get("tags", []),
            }
            for v in self.layouts.values()
        ]

    def get_layout_info(self, name: str) -> Optional[dict]:
        layout = self.layouts.get(name)
        if not layout:
            return None
        return {
            "name": layout["name"],
            "description": layout["description"],
            "tags": layout.get("tags", []),
        }

    def get_all_css(self) -> str:
        """返回所有布局相关的 CSS（目前内联在基础 CSS 中）"""
        return ""
