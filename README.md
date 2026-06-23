<p align="center">
  <h1 align="center">◈ HTML Point</h1>
  <p align="center"><strong>开源 Keynote 替代</strong> · 基于 HTML 的所见即所得演示文稿工具</p>
  <p align="center"><em>Open-source Keynote Alternative — A WYSIWYG presentation tool built on HTML</em></p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-orange.svg" alt="License MIT">
  <img src="https://img.shields.io/badge/Python-3.8+-blue.svg" alt="Python 3.8+">
  <img src="https://img.shields.io/badge/JavaScript-Vanilla-yellow.svg" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/Dependencies-Zero-brightgreen.svg" alt="Zero Dependencies">
</p>

---

## 📖 简介 / Introduction

**HTML Point** 是一个开源、零依赖、本地运行的演示文稿工具。它最大的特点是：**像 Keynote 一样所见即所得地编辑，但保存在一个普通的 HTML 文件中**——发给任何人，双击就能看，不需要安装任何软件。

**HTML Point** is an open-source, zero-dependency, locally-run presentation tool. Its killer feature: **edit like Keynote with WYSIWYG, but save as a plain HTML file** — share it with anyone, they just double-click to view. No software installation needed.

---

## 🖥️ 截图 / Screenshots

> 📸 *让你的项目截图替换下面的占位区域。推荐截图内容：编辑模式全景、属性面板特写、演示模式、模板选择页。*
>
> 📸 *Replace the placeholders below with your actual screenshots. Recommended: full editing view, inspector panel close-up, presentation mode, template picker.*

| 编辑模式 | 演示模式 |
|:---:|:---:|
| ![编辑模式](https://via.placeholder.com/640x360/1c1c1e/ff6b35?text=Edit+Mode) | ![演示模式](https://via.placeholder.com/640x360/0a0a0a/ffffff?text=Presentation+Mode) |

| 首页文件管理 | 属性检查器 |
|:---:|:---:|
| ![首页](https://via.placeholder.com/640x360/0a0a0a/ff6b35?text=File+Manager) | ![属性面板](https://via.placeholder.com/640x360/1c1c1e/00d4ff?text=Inspector) |

---

## ✨ 特性 / Features

### 🖊️ 所见即所得编辑
- 点击文字直接修改（`contenteditable`）
- 拖拽图片自由布局，四角手柄等比缩放
- 属性检查器：字号、颜色、对齐、圆角、亮度、边框色
- **UndoManager**：自研撤销栈，支持 `Ctrl+Z` 无限撤销
- 辅助线吸附：拖拽时显示中线对齐参考线

### 🎨 模板系统
- **深色科技**（默认）— 深空黑底 + 橙色高亮，适合科技/产品/路演
- **极简白** — 纯白底 + 蓝色点缀，适合学术/汇报
- **渐变紫** — 深紫底 + 金色点缀，适合创意/品牌
- 一键从模板新建，自动替换配色变量

### 📽️ 演示模式
- 一键全屏播放，`Esc` 回到编辑
- 左右方向键翻页
- 演示视图自动隐藏编辑器 UI

### 🔒 安全
- 路径穿越防护（`safe_join` 校验）
- 外部 `script` 标签剥离（防 XSS）
- 文件类型白名单（仅 `.html`）
- 上传大小限制（10MB）

---

## 📋 前置要求 / Prerequisites

- **Python 3.8+**（无需 pip install 任何包——全部使用标准库）
- 现代浏览器（Chrome / Firefox / Safari / Edge）

---

## 🚀 快速开始 / Quick Start

```bash
# 克隆仓库
git clone https://github.com/azhu97/html-point.git
cd html-point

# 一键启动
./start.sh

# 或者
python3 server.py
```

浏览器访问：**http://localhost:3099**

### 三种打开方式

| 方式 | URL 示例 | 用途 |
|------|---------|------|
| **首页** | `http://localhost:3099` | 文件管理、模板选择、导入 |
| **编辑** | `http://localhost:3099/edit?file=demo.html` | 打开文稿进入编辑 |
| **演示** | `http://localhost:3099/view?file=demo.html` | 全屏只读播放 |

---

## 🏗️ 项目架构 / Architecture

```
html-point/
├── server.py                  # 入口：启动 HTTP 服务 (port 3099)
├── start.sh                   # 一键启动脚本
├── LICENSE                    # MIT 许可证
├── README.md                  # 本文件
│
├── src/                       # 后端 Python 模块
│   ├── app.py                 # 路由分发 (GET/POST) & HTTP Handler
│   ├── storage.py             # 文件 CRUD (列表/保存/删除/上传)
│   ├── template.py            # 模板系统 (3 套内置模板)
│   ├── security.py            # 安全校验 (路径/文件名/XSS/大小)
│   └── editor_injector.py     # 编辑器 JS 注入到演示 HTML
│
├── web/                       # 前端 (零框架)
│   ├── index.html             # 首页：文件管理 + 模板选择
│   ├── app.css                # 首页样式
│   └── editor.js              # Keynote 风格编辑器 (~200 行 Class 化)
│
├── templates/                 # 内置模板 HTML
│   ├── dark-tech.html         # 深色科技
│   ├── light-minimal.html     # 极简白
│   └── gradient-purple.html   # 渐变紫
│
├── presentations/             # 你的文稿 (.html 文件)
│
└── tests/
    └── test_storage.py        # 单元测试 (8 个用例)
```

### 数据流 / Data Flow

```
浏览器请求                        服务器响应
──────────                       ──────────
GET  /                    ──→   index.html (首页)
GET  /api/list            ──→   JSON 文件列表
GET  /edit?file=xxx.html  ──→   原始 HTML → 净化 → 注入 editor.js
POST /api/save             ──→   接收 HTML → 剥离编辑器 → 写入 presentations/
GET  /view?file=xxx.html   ──→   原始 HTML → 净化 → 隐藏编辑器 UI → 返回
```

---

## ⌨️ 快捷键 / Shortcuts

| 键 | 功能 |
|---|------|
| **← →** | 前后翻页 |
| **Cmd/Ctrl + S** | 保存到文件 |
| **Cmd/Ctrl + Z** | 撤销文字编辑 |
| **Cmd/Ctrl + Shift + Z** | 重做 |
| **Esc** | 退出编辑 / 退出全屏演示 |

---

## 📤 导出分享 / Export & Share

在编辑模式下点击 **💾 保存**（或 `Cmd+S`），文稿保存到 `presentations/` 目录。

把这个 `.html` 文件发给别人，**双击即可观看**——不需要安装任何软件，不需要启动服务器。

> 💡 **演示稿完全独立运行**：所有 CSS 内联在 `<style>` 中，所有内容内嵌在 HTML 里，不依赖外部资源（Google Fonts 除外，模板中使用了字体 CDN）。

---

## 🔌 API 端点 / API Endpoints

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/list` | 列出 `presentations/` 下所有 `.html` 文件 |
| `GET` | `/edit?file=xxx.html` | 打开文稿进入编辑模式 |
| `GET` | `/edit?template=dark-tech` | 从模板新建文稿 |
| `GET` | `/view?file=xxx.html` | 演示模式（只读全屏） |
| `POST` | `/api/save` | 保存 HTML（`application/x-www-form-urlencoded` 或纯文本） |
| `POST` | `/api/delete?file=xxx.html` | 删除指定文件 |
| `POST` | `/api/upload` | 上传 HTML 文件（`multipart/form-data`） |

---

## 🧪 运行测试 / Run Tests

```bash
python3 -m pytest tests/ -v
```

测试覆盖：
- ✅ 路径安全：防穿越、防绝对路径、防非 HTML 扩展
- ✅ 文件名净化：去路径成分、自动补 `.html`
- ✅ 文件大小校验（上限 10MB）
- ✅ 存储 CRUD：保存/列表/删除/上传
- ✅ 编辑器脚本剥离（保存时清理注入）

---

## 🤝 贡献 / Contributing

欢迎提 Issue 和 PR！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feat/amazing-feature`)
3. 提交更改 (`git commit -m '✨ feat: add amazing feature'`)
4. 推送到分支 (`git push origin feat/amazing-feature`)
5. 开启 Pull Request

提交信息请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式。

---

## 📄 许可证 / License

MIT © [HTML Point](https://github.com/azhu97/html-point) — 自由使用、修改、分发，详见 [LICENSE](LICENSE)。

---

<p align="center">
  <sub>Made with ❤️ for people who just want to make slides without learning Markdown.</sub>
</p>
