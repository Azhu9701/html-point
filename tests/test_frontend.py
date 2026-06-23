"""前端自动化测试 (Playwright)

测试编辑器和演示器的核心交互:
  - /edit 工具栏加载
  - 侧栏缩略图点击翻页 (回归: 之前坏的)
  - 方向键翻页 (回归: 之前坏的)
  - /view 演示稿原生 go() 保留 (架构修复验证)
  - /view 动画引擎 playSlide 保留 (架构修复验证)

运行: python3 -m pytest tests/test_frontend.py -v
前置: playwright install chromium
"""

import sys
import socket
import subprocess
import time
from pathlib import Path
from threading import Thread

import pytest
from playwright.sync_api import sync_playwright

# 把项目根目录加入 path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

PORT = 4099  # 测试用端口, 避免和开发端口冲突


def _free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _start_server(port):
    """启动测试服务器 (子进程)"""
    env = {"HTML_POINT_PORT": str(port)}
    proc = subprocess.Popen(
        [sys.executable, str(ROOT / "server.py")],
        cwd=str(ROOT),
        env={**__import__("os").environ, **env},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # 等待端口就绪
    for _ in range(50):
        try:
            with socket.socket() as s:
                s.connect(("127.0.0.1", port))
                return proc
        except (ConnectionRefusedError, OSError):
            time.sleep(0.2)
    proc.kill()
    raise RuntimeError("服务器启动超时")


@pytest.fixture(scope="module")
def server():
    """启动服务器, 模块级共享"""
    port = _free_port()
    proc = _start_server(port)
    base = f"http://127.0.0.1:{port}"
    yield base
    proc.kill()
    proc.wait()


@pytest.fixture(scope="module")
def browser():
    """启动 headless 浏览器"""
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        yield b
        b.close()


class TestEditRoute:
    """编辑模式 (/edit) 测试"""

    def test_editor_toolbar_loads(self, server, browser):
        """/edit 加载后编辑器工具栏存在"""
        page = browser.new_page()
        page.goto(f"{server}/edit?file=demo.html", wait_until="networkidle")
        bar = page.wait_for_selector("#ppt-bar", timeout=5000)
        assert bar is not None
        # 编辑按钮存在
        assert page.query_selector("#eb-t") is not None
        # 保存按钮存在
        assert page.query_selector("#eb-s") is not None
        page.close()

    def test_sidebar_click_navigates(self, server, browser):
        """侧栏缩略图点击能翻页 (回归: 之前 go() 被 strip 导致点击无效)"""
        page = browser.new_page()
        page.goto(f"{server}/edit?file=demo.html", wait_until="networkidle")
        # 进入编辑模式 (侧栏才会显示)
        page.click("#eb-t")
        page.wait_for_selector("#ppt-sb.on", timeout=3000)
        # 等侧栏缩略图生成
        page.wait_for_selector(".sb-t", timeout=3000)
        thumbs = page.query_selector_all(".sb-t")
        assert len(thumbs) > 1, f"侧栏缩略图不足: {len(thumbs)}"
        # 记录初始页码
        before = page.evaluate("window.__currentSlideIndex || 0")
        # 点击第 3 个缩略图
        thumbs[2].click()
        page.wait_for_timeout(800)  # 等翻页动画
        after = page.evaluate("window.__currentSlideIndex || 0")
        assert after == 2, f"点击缩略图后页码应为 2, 实际 {after} (点击前 {before})"
        page.close()

    def test_arrow_key_navigates(self, server, browser):
        """方向键能翻页 (回归: 之前键盘导航失效)"""
        page = browser.new_page()
        page.goto(f"{server}/edit?file=demo.html", wait_until="networkidle")
        before = page.evaluate("window.__currentSlideIndex || 0")
        # 按 → 键
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(800)
        after = page.evaluate("window.__currentSlideIndex || 0")
        assert after > before, f"→ 键后页码应增加: {before} → {after}"
        # 按 ← 键
        page.keyboard.press("ArrowLeft")
        page.wait_for_timeout(800)
        back = page.evaluate("window.__currentSlideIndex || 0")
        assert back < after, f"← 键后页码应减少: {after} → {back}"
        page.close()


class TestViewRoute:
    """演示模式 (/view) 测试"""

    def test_native_go_preserved(self, server, browser):
        """演示稿原生 go() 被白名单保留 (架构修复验证)"""
        page = browser.new_page()
        page.goto(f"{server}/view?file=demo.html", wait_until="networkidle")
        page.wait_for_timeout(1000)
        go_type = page.evaluate("typeof window.go")
        assert go_type == "function", f"go() 应为 function, 实际 {go_type}"
        page.close()

    def test_native_animation_preserved(self, server, browser):
        """演示稿原生 playSlide 被白名单保留 (架构修复验证)"""
        page = browser.new_page()
        page.goto(f"{server}/view?file=demo.html", wait_until="networkidle")
        page.wait_for_timeout(1000)
        ps_type = page.evaluate("typeof window.__playSlide")
        assert ps_type == "function", f"__playSlide 应为 function, 实际 {ps_type}"
        page.close()

    def test_view_arrow_key_navigates(self, server, browser):
        """演示模式方向键翻页 (回归: 之前 presenter.js 键盘失效)"""
        page = browser.new_page()
        page.goto(f"{server}/view?file=demo.html", wait_until="networkidle")
        page.wait_for_timeout(1000)
        before = page.evaluate("window.__currentSlideIndex || 0")
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(800)
        after = page.evaluate("window.__currentSlideIndex || 0")
        assert after > before, f"演示模式 → 键应翻页: {before} → {after}"
        page.close()

    def test_presenter_toolbar_loads(self, server, browser):
        """演示工具栏存在"""
        page = browser.new_page()
        page.goto(f"{server}/view?file=demo.html", wait_until="networkidle")
        bar = page.wait_for_selector("#ppt-pres-bar", timeout=5000)
        assert bar is not None
        # 计时器按钮存在
        assert page.query_selector("#pt-timer") is not None
        # PDF 按钮存在
        assert page.query_selector("#pt-pdf") is not None
        page.close()


class TestCoreModule:
    """公共模块 (core.js) 测试"""

    def test_core_loaded_in_edit(self, server, browser):
        """core.js 在 /edit 已加载"""
        page = browser.new_page()
        page.goto(f"{server}/edit?file=demo.html", wait_until="networkidle")
        loaded = page.evaluate("typeof window.__pptCore")
        assert loaded == "object", f"__pptCore 应为 object, 实际 {loaded}"
        page.close()

    def test_core_loaded_in_view(self, server, browser):
        """core.js 在 /view 已加载"""
        page = browser.new_page()
        page.goto(f"{server}/view?file=demo.html", wait_until="networkidle")
        loaded = page.evaluate("typeof window.__pptCore")
        assert loaded == "object", f"__pptCore 应为 object, 实际 {loaded}"
        page.close()
