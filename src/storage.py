"""文件管理: 列表 / 保存 / 删除 / 上传

所有文件操作通过 security.safe_join() 校验路径安全。
"""

import time
import shutil
import re
import base64
from pathlib import Path
from .security import safe_join, sanitize_filename, validate_file_size, strip_injected_scripts


# 本地图片路径模式 (macOS / Linux / Windows)
_LOCAL_IMG_PATTERN = re.compile(
    r'src="(/(?:Users|home)/[^"]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp))"',
    re.IGNORECASE
)

# 文件路径 → MIME 类型映射
_IMG_MIME = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
}


def embed_local_images(html: str) -> str:
    """扫描 HTML 中的本地图片路径, 转换为 base64 data URL 内嵌。

    匹配模式: src=\"/Users/...\" 或 src=\"/home/...\" 
    效果: 导出的 HTML 完全自包含, 无需携带图片文件。
    """
    def _replace(match):
        path = match.group(1)
        try:
            ext = Path(path).suffix.lower()
            mime = _IMG_MIME.get(ext)
            if not mime:
                return match.group(0)  # 不支持的格式, 保持原样
            with open(path, 'rb') as f:
                b64 = base64.b64encode(f.read()).decode()
            return f'src="data:{mime};base64,{b64}"'
        except (FileNotFoundError, PermissionError, OSError):
            return match.group(0)  # 文件不存在或无权限, 保持原样
    return _LOCAL_IMG_PATTERN.sub(_replace, html)


def list_files(presentations_dir: Path) -> list[dict]:
    """列出 presentations/ 下所有 .html 文件, 按修改时间倒序"""
    presentations_dir.mkdir(exist_ok=True)
    files = []
    for p in sorted(
        presentations_dir.glob("*.html"),
        key=lambda x: x.stat().st_mtime,
        reverse=True,
    ):
        st = p.stat()
        files.append({
            "name": p.name,
            "size": f"{st.st_size / 1024:.0f} KB",
            "modified": time.strftime("%Y-%m-%d %H:%M", time.localtime(st.st_mtime)),
        })
    return files


def save_file(base_dir: Path, filename: str, html: str) -> dict:
    """保存演示稿, 覆盖同名文件。返回 {ok, path, name} 或 {ok, error}"""
    filename = sanitize_filename(filename)
    dest, err = safe_join(base_dir, filename)
    if err:
        return {"ok": False, "error": err}

    # 清理编辑器注入
    clean = strip_injected_scripts(html)
    # 内嵌本地图片 → base64 (导出后无需带图片文件)
    clean = embed_local_images(clean)
    base_dir.mkdir(exist_ok=True)
    dest.write_text(clean, encoding="utf-8")
    return {"ok": True, "path": str(dest), "name": dest.name}


def delete_file(base_dir: Path, filename: str) -> dict:
    """删除指定文件"""
    dest, err = safe_join(base_dir, filename)
    if err:
        return {"ok": False, "error": err}
    if not dest.exists():
        return {"ok": False, "error": "文件不存在"}
    dest.unlink()
    return {"ok": True}


def upload_file(base_dir: Path, filename: str, data: bytes) -> dict:
    """上传 HTML 文件, 重名自动加后缀"""
    err = validate_file_size(data)
    if err:
        return {"ok": False, "error": err}

    filename = sanitize_filename(filename)
    dest, err = safe_join(base_dir, filename)
    if err:
        return {"ok": False, "error": err}

    # 重名则加数字后缀
    base_dir.mkdir(exist_ok=True)
    counter = 1
    stem = Path(filename).stem
    while dest.exists():
        new_name = f"{stem}-{counter}.html"
        dest, err = safe_join(base_dir, new_name)
        if err:
            return {"ok": False, "error": err}
        counter += 1

    dest.write_bytes(data)
    return {"ok": True, "name": dest.name}


def copy_demo(demo_src: Path, presentations_dir: Path):
    """首次运行时, 复制示例演示稿到 presentations/"""
    if not demo_src.exists():
        return
    demo_dst = presentations_dir / "demo.html"
    if not demo_dst.exists():
        shutil.copy2(demo_src, demo_dst)
