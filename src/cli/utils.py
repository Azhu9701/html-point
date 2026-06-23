# CLI 工具函数
import json
import sys
from pathlib import Path


def print_error(msg: str):
    print(f"  ❌ {msg}", file=sys.stderr)


def print_success(msg: str):
    print(f"  ✅ {msg}")


def print_info(msg: str):
    print(f"  ℹ️  {msg}")


def print_warning(msg: str):
    print(f"  ⚠️  {msg}")


def print_table(headers: list[str], rows: list[list[str]]):
    """简单表格输出"""
    col_widths = [max(len(str(h)), max(len(str(r[i])) for r in rows)) for i, h in enumerate(headers)]
    # 表头
    header_line = " | ".join(h.ljust(col_widths[i]) for i, h in enumerate(headers))
    print(f"  {header_line}")
    print(f"  {'-' * len(header_line)}")
    # 数据行
    for row in rows:
        print(f"  {' | '.join(str(row[i]).ljust(col_widths[i]) for i in range(len(headers)))}")


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)
    return path


def load_json_or_yaml(path: Path) -> dict:
    """自动检测 JSON 或 YAML 并加载"""
    text = path.read_text(encoding="utf-8")
    ext = path.suffix.lower()
    if ext in (".json", ""):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
    if ext in (".yaml", ".yml") or ext == "":
        try:
            import yaml
            return yaml.safe_load(text)
        except ImportError:
            raise RuntimeError("解析 YAML 需要 PyYAML: pip install pyyaml")
    raise ValueError(f"不支持的文件格式: {ext}")
