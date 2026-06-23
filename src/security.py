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
    """去掉编辑器/演示器/核心注入的 script 块, 保留原始内容"""
    # 匹配新标记 (ppt-core/ppt-editor/ppt-presenter) 和旧标记 (编辑器)
    return re.sub(
        r'<!-- HTML Point (?:ppt-core|ppt-editor|ppt-presenter|编辑器).*?</script>\s*',
        '', html, flags=re.S
    )


def strip_all_scripts(html: str) -> str:
    """彻底去掉所有 <script> 标签 (用于展示上传的外部HTML时防XSS)"""
    return re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.S | re.I)


# ── 白名单: 演示稿内部脚本的特征模式 ──────────────────────
# 命中任一模式则保留该 <script> 块 (认为是演示稿自带的合法功能)
_SAFE_SCRIPT_PATTERNS = [
    r'function\s+go\s*\(',       # 导航引擎 go()
    r'__currentSlideIndex',      # 导航状态
    r'playSlide',                # 动画播放
    r'RECIPES',                  # 动画配方
    r'motion-ready',             # 动画激活类
    r'__lowPowerMode',           # 低功耗模式
    r'u_resolution',             # WebGL 背景
    r'ascii-bg',                 # Canvas 点阵背景
    r'lucide',                   # 图标库
    r'\bimport\s*\(',            # ES module 动态导入 (Motion One)
]

# 黑名单: 必须删除的脚本特征 (即使命中白名单也删)
_UNSAFE_SCRIPT_PATTERNS = [
    r'__PPT_EDITOR_LOADED__',    # 旧版嵌入式编辑器 (与新版冲突)
]


def strip_scripts_whitelist(html: str) -> str:
    """白名单模式清理脚本: 保留演示稿内部功能脚本, 删除旧编辑器和外部风险脚本。

    策略:
      1. 先删已注入的 HTML Point 块 (防重复)
      2. 遍历每个 <script> 块:
         - 命中黑名单 → 删除
         - 命中白名单 → 保留 (演示稿自带的导航/动画/背景)
         - 都没命中 → 删除 (未知外部脚本, 防 XSS)
    """
    # 先清理已注入块
    html = strip_injected_scripts(html)

    def _classify(match):
        block = match.group(0)
        # 黑名单优先: 旧编辑器一定删
        for pat in _UNSAFE_SCRIPT_PATTERNS:
            if re.search(pat, block):
                return ''
        # 白名单: 演示稿内部功能保留
        for pat in _SAFE_SCRIPT_PATTERNS:
            if re.search(pat, block):
                return block
        # 既不在白名单也不在黑名单 → 删除 (安全默认)
        return ''

    return re.sub(r'<script[^>]*>.*?</script>', _classify, html, flags=re.S | re.I)
