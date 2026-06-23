"""编辑器注入: 将 editor.js 动态嵌入演示稿 HTML 的 </body> 前"""

import re
from pathlib import Path

from typing import Optional, Union


def inject(html: str, editor_js_path: Union[str, Path], marker: str = "ppt-editor") -> str:
    """在 HTML 的 </body> 前注入 JS。已注入过则先清理旧版本。

    marker: 注释标记名，用于区分不同注入块 (ppt-editor / ppt-presenter)。
    """
    js = Path(editor_js_path).read_text(encoding="utf-8")

    # 清理旧注入 (匹配指定 marker 的块)
    html = re.sub(
        rf'<!-- HTML Point {marker}.*?</script>\s*',
        '', html, flags=re.S
    )

    inject_block = (
        f"\n<!-- HTML Point {marker} -->\n"
        "<script>\n" + js + "\n</script>\n"
    )
    return html.replace("</body>", inject_block + "</body>", 1)
