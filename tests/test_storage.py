"""存储模块单元测试"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import tempfile
from src.storage import list_files, save_file, delete_file, upload_file
from src.security import safe_join, sanitize_filename, validate_file_size


class TestSecurity:
    def test_safe_join_normal(self):
        base = Path("/tmp/test-html-point")
        path, err = safe_join(base, "demo.html")
        assert err is None
        assert path.name == "demo.html"

    def test_safe_join_rejects_traversal(self):
        base = Path("/tmp/test-html-point")
        _, err = safe_join(base, "../etc/passwd")
        assert err is not None

    def test_safe_join_rejects_abs_path(self):
        base = Path("/tmp/test-html-point")
        _, err = safe_join(base, "/etc/passwd")
        assert err is not None

    def test_safe_join_rejects_non_html(self):
        base = Path("/tmp/test-html-point")
        _, err = safe_join(base, "test.exe")
        assert err is not None

    def test_sanitize_filename_strips_path(self):
        name = sanitize_filename("/etc/malicious.html")
        assert "/" not in name
        assert name.endswith(".html")

    def test_sanitize_filename_adds_extension(self):
        name = sanitize_filename("myfile")
        assert name.endswith(".html")

    def test_validate_file_size_ok(self):
        err = validate_file_size(b"x" * 100)
        assert err is None

    def test_validate_file_size_too_large(self):
        err = validate_file_size(b"x" * (11 * 1024 * 1024))
        assert err is not None


class TestStorage:
    def test_list_creates_dir(self):
        with tempfile.TemporaryDirectory() as d:
            base = Path(d) / "presentations"
            files = list_files(base)
            assert base.exists()
            assert isinstance(files, list)

    def test_save_and_list(self):
        with tempfile.TemporaryDirectory() as d:
            base = Path(d) / "presentations"
            result = save_file(base, "test.html", "<html><body>hello</body></html>")
            assert result["ok"] is True
            assert result["name"] == "test.html"
            files = list_files(base)
            assert any(f["name"] == "test.html" for f in files)

    def test_delete(self):
        with tempfile.TemporaryDirectory() as d:
            base = Path(d) / "presentations"
            save_file(base, "test.html", "<html></html>")
            result = delete_file(base, "test.html")
            assert result["ok"] is True
            files = list_files(base)
            assert not any(f["name"] == "test.html" for f in files)

    def test_upload_rejects_oversize(self):
        with tempfile.TemporaryDirectory() as d:
            base = Path(d) / "presentations"
            result = upload_file(base, "big.html", b"x" * (11 * 1024 * 1024))
            assert result["ok"] is False

    def test_save_strips_injected_script(self):
        with tempfile.TemporaryDirectory() as d:
            base = Path(d) / "presentations"
            html = "<html><body>hello<!-- HTML Point 编辑器 -->\n<script>\nalert(1)\n</script>\n</body></html>"
            result = save_file(base, "clean.html", html)
            assert result["ok"] is True
            saved = (base / "clean.html").read_text()
            assert "alert(1)" not in saved
