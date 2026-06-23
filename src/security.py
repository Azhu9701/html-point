"""安全校验模块: 路径安全 / 文件名净化 / 类型限制 / 大小限制"""

import os
import re
from pathlib import Path

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".html"}


def safe_join(base_dir: Path, filename: str) -> Path:
    """
    安全拼接路径, 拒绝路径穿越攻击。
    返回 (resolved_path, error_message) — error 非空表示非法。
    """
    # 1. 只取文件名部分, 不要任何目录成分
    basename = os.path.basename(filename)
    if not basename or basename in (".", "..", ""):
        return None, "无效文件名"

    # 2. 检查扩展名
    ext = Path(basename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return None, f"不允许的文件类型: {ext}"

    # 3. 构建完整路径
    full = (base_dir / basename).resolve()

    # 4. 解析后必须在 base_dir 以内 (防 symlink / .. / 绝对路径)
    base_resolved = base_dir.resolve()
    try:
        full.relative_to(base_resolved)
    except ValueError:
        return None, "路径穿越被拒绝"

    # 5. 拒绝 symlink
    if full.is_symlink():
        return None, "不允许符号链接"

    return full, None


def sanitize_filename(name: str) -> str:
    """净化文件名: 去掉路径分隔符和非法字符"""
    # 去路径成分
    name = os.path.basename(name)
    # 去掉 < > : " / \ | ? *
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    # 去首尾空白和点
    name = name.strip(". ")
    if not name:
        name = "untitled"
    if not name.endswith(".html"):
        name += ".html"
    return name


def validate_file_size(data: bytes) -> str | None:
    """校验文件大小, 超标返回错误信息"""
    if len(data) > MAX_FILE_SIZE:
        return f"文件过大: {len(data) / 1024 / 1024:.1f} MB (最大 {MAX_FILE_SIZE / 1024 / 1024:.0f} MB)"
    return None


def strip_injected_scripts(html: str) -> str:
    """去掉编辑器/演示器注入的 script 块, 保留原始内容"""
    # 匹配新标记 (ppt-editor / ppt-presenter) 和旧标记 (编辑器)
    return re.sub(
        r'<!-- HTML Point (?:ppt-editor|ppt-presenter|编辑器).*?</script>\s*',
        '', html, flags=re.S
    )


def strip_all_scripts(html: str) -> str:
    """彻底去掉所有 <script> 标签 (用于展示上传的外部HTML时防XSS)"""
    return re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.S | re.I)
