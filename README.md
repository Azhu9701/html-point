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
  <img src="https://img.shields.io/badge/CLI-Available-blue.svg" alt="CLI Available">
</p>

---

## 📖 简介 / Introduction

**HTML Point** 是一个开源、零依赖、本地运行的演示文稿工具。它最大的特点是：**像 Keynote 一样所见即所得地编辑，但保存在一个普通的 HTML 文件中**——发给任何人，双击就能看，不需要安装任何软件。

**HTML Point** is an open-source, zero-dependency, locally-run presentation tool. Its killer feature: **edit like Keynote with WYSIWYG, but save as a plain HTML file** — share it with anyone, they just double-click to view. No software installation needed.

### v3 新增亮点
- **CLI 工具**：通过命令行生成、转换、导出幻灯片，方便 Agent 自动化调用
- **10 套主题**：科技、商务、学术、创意、极简、瑞士、自然、午夜、樱花、赛博
- **16 种布局**：标题、内容、双栏、三栏、全图、对比、KPI、图表、表格、代码、引用、视频、时间线、空白
- **Markdown / JSON / YAML 输入**：从纯文本直接生成精美幻灯片
- **增强编辑器**：支持插入表格、代码块、形状、视频、引用；查找替换；幻灯片母版
- **增强演示器**：激光笔、绘图批注、缩略图导航、排练计时、逐条展示
- **导出引擎**：PDF、PNG、PPTX、HTML-ZIP

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
- **Command 模式撤销系统**：支持 `Ctrl+Z` 无限撤销，涵盖样式、位置、大小、文字、幻灯片操作
- 辅助线吸附：拖拽时显示中线对齐参考线 + 8px 网格吸附
- 查找替换：`Ctrl+F` 全局搜索替换
- 幻灯片母版：一键设置全局字体、颜色、背景

### 🧱 插入组件
- 表格（对话框输入行列数）
- 代码块（支持 JavaScript/Python/HTML/CSS/Rust/Bash）
- 形状（矩形、圆形、箭头）
- 视频 / iframe（支持 YouTube 自动转换）
- 引用块（blockquote）
- 文本框

### 🎨 模板与主题
- **10 套内置主题**：深色科技、极简白、渐变紫、瑞士 IKB、森林绿、暖陶土、午夜蓝、樱花粉、单色灰、霓虹赛博
- **16 种布局模板**：标题、内容、双栏、三栏、全图、对比、KPI、图表、表格、代码、引用、视频、时间线、空白
- 一键从模板新建，自动替换配色变量
- 支持自定义 YAML 主题定义

### 📽️ 演示模式
- 一键全屏播放，`Esc` 回到编辑
- 左右方向键翻页
- 演讲者备注（`N` 键）
- 逐条展示（`F` 键，支持 up/left/down/right/zoom/rotate 动画）
- 计时器（`T` 键，大字计时器）
- 激光笔（`L` 键按住）
- 绘图批注（`D` 键，多色多粗细涂鸦）
- 缩略图导航（`G` 键，网格缩略图点击跳转）
- 页码跳转（`J` 键）
- 排练计时（`R` 键，记录每页停留时间）
- PDF 导出（`P` 键）

### 🔧 CLI 工具
- `html-point init` — 初始化新演示稿
- `html-point build` — 从 JSON / YAML / Markdown 构建 HTML
- `html-point serve` — 启动编辑服务器
- `html-point convert` — 转换 PPTX / Markdown 为 HTML
- `html-point export` — 导出 PDF / PNG / PPTX / HTML-ZIP
- `html-point theme` — 主题管理（列出/应用）
- `html-point template` — 布局模板管理（列出/查看详情）
- `html-point validate` — 验证演示稿格式

### 🔒 安全
- 路径穿越防护（`safe_join` 校验）
- 白名单脚本过滤（保留演示稿内部功能，删除外部风险脚本）
- 文件类型白名单（仅 `.html`）
- 上传大小限制（10MB）

---

## 📋 前置要求 / Prerequisites

- **Python 3.8+**（无需 pip install 任何包即可运行基础功能——全部使用标准库）
- 现代浏览器（Chrome / Firefox / Safari / Edge）

### 可选依赖（用于导出和转换）
```bash
# PDF / PNG 导出
pip install playwright
playwright install chromium

# PPTX 转换
pip install python-pptx

# YAML 解析
pip install pyyaml
```

---

## 🚀 快速开始 / Quick Start

### 方式 1：Web 编辑器（GUI）
```bash
# 克隆仓库
git clone https://github.com/azhu97/html-point.git
cd html-point

# 一键启动
./start.sh
# 或者
python3 server.py

# 浏览器访问 http://localhost:3099
```

### 方式 2：CLI 生成（Agent 友好）
```bash
# 从 Markdown 生成幻灯片
python3 cli.py build slides.md --out=presentation.html --theme=dark-tech

# 从 JSON 生成幻灯片
python3 cli.py build slides.json --out=presentation.html --theme=swiss-ikb

# 初始化空白演示稿
python3 cli.py init my-deck --theme=forest-green --slides=10

# 导出 PDF
python3 cli.py export presentation.html --format=pdf --out=output.pdf

# 列出所有主题
python3 cli.py theme list

# 列出所有布局模板
python3 cli.py template list
```

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
├── cli.py                      # CLI 入口
├── server.py                   # HTTP 服务入口
├── start.sh                    # 一键启动脚本
├── LICENSE
├── README.md
│
├── src/                        # 后端 Python 模块
│   ├── app.py                  # 路由分发 & HTTP Handler
│   ├── storage.py              # 文件 CRUD (列表/保存/删除/上传)
│   ├── template.py             # 模板系统 (3 套内置模板)
│   ├── security.py             # 安全校验 (白名单脚本过滤/路径安全)
│   ├── editor_injector.py      # JS 注入到演示 HTML
│   ├── cli/                    # CLI 模块
│   │   ├── commands.py         # 子命令实现
│   │   └── utils.py            # CLI 工具函数
│   └── engine/                 # 幻灯片引擎
│       ├── builder.py          # 从数据构建 HTML
│       ├── parser.py           # 解析 JSON/YAML/Markdown
│       ├── layout.py           # 16 种布局系统
│       ├── component.py        # 组件注册表
│       ├── theme.py            # 10 套主题引擎
│       └── export.py           # 导出引擎 (PDF/PNG/PPTX)
│
├── web/                        # 前端 (零框架)
│   ├── index.html              # 首页：文件管理 + 模板选择
│   ├── app.css                 # 首页样式
│   ├── core.js                 # 公共引擎 (导航+动画 fallback)
│   ├── editor.js               # Keynote 风格编辑器 (~1300 行)
│   └── presenter.js            # 演示模式增强 (~600 行)
│
├── templates/                  # 内置模板 HTML
│   ├── dark-tech.html
│   ├── light-minimal.html
│   └── gradient-purple.html
│
├── layouts/                    # 自定义布局片段
├── components/                 # 自定义组件片段
├── themes/                     # 自定义主题 YAML
├── examples/                   # 示例文件
│   ├── slides.json
│   └── slides.md
├── presentations/              # 你的文稿 (.html 文件)
│
└── tests/
    └── test_storage.py         # 单元测试
```

### 数据流 / Data Flow

```
浏览器请求                        服务器响应
──────────                       ──────────
GET  /                    ──→   index.html (首页)
GET  /api/list            ──→   JSON 文件列表
GET  /edit?file=xxx.html  ──→   原始 HTML → 白名单净化 → 注入 core.js + editor.js
POST /api/save             ──→   接收 HTML → 剥离编辑器 → 写入 presentations/
GET  /view?file=xxx.html   ──→   原始 HTML → 白名单净化 → 注入 core.js + presenter.js
```

---

## ⌨️ 快捷键 / Shortcuts

### 编辑器模式
| 键 | 功能 |
|---|------|
| **← →** | 前后翻页 |
| **Cmd/Ctrl + S** | 保存到文件 |
| **Cmd/Ctrl + Z** | 撤销 |
| **Cmd/Ctrl + Shift + Z** | 重做 |
| **Cmd/Ctrl + F** | 查找替换 |
| **Esc** | 退出编辑 / 退出全屏演示 |

### 演示模式
| 键 | 功能 |
|---|------|
| **← → / Space** | 前后翻页 |
| **N** | 演讲者备注 |
| **T** | 计时器 / 大字计时器 |
| **F** | 逐条展示 |
| **L (按住)** | 激光笔 |
| **D** | 绘图批注模式 |
| **G** | 缩略图导航网格 |
| **J** | 跳转页码 |
| **R** | 排练计时 |
| **P** | 导出 PDF |
| **Home / End** | 跳转到首/尾页 |
| **Esc** | 退出备注 / 计时器 / 绘图 |

---

## 📤 导出分享 / Export & Share

### 在编辑器中保存
在编辑模式下点击 **💾 保存**（或 `Cmd+S`），文稿保存到 `presentations/` 目录。

### CLI 导出
```bash
# 导出 PDF（需要 Playwright）
python3 cli.py export presentation.html --format=pdf --out=output.pdf

# 导出 PNG（所有页面）
python3 cli.py export presentation.html --format=png --out=slides/ --all-pages

# 导出 PPTX（需要 python-pptx）
python3 cli.py export presentation.html --format=pptx --out=output.pptx

# 打包为独立 HTML ZIP
python3 cli.py export presentation.html --format=html-zip --out=package.zip
```

### 直接分享 HTML
把 `.html` 文件发给别人，**双击即可观看**——不需要安装任何软件，不需要启动服务器。

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
- ✅ 白名单脚本过滤：保留内部功能，删除外部风险
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
