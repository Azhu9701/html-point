"""编辑器注入: 将 editor.js 动态嵌入演示稿 HTML 的 </body> 前"""

import re
from pathlib import Path

def inject(html: str, editor_js_path: str | Path) -> str:
    """在 HTML 的 </body> 前注入编辑器 JS。已注入过则先清理旧版本。"""
    js = Path(editor_js_path).read_text(encoding="utf-8")

    # 清理旧注入
    html = re.sub(
        r'<!-- HTML Point 编辑器.*?</script>\s*',
        '', html, flags=re.S
    )

    inject_block = (
        "\n<!-- HTML Point 编辑器 -->\n"
        "<script>\n" + js + "\n</script>\n"
    )
    return html.replace("</body>", inject_block + "</body>", 1)
