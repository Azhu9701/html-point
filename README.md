# HTML Point

**开源 Keynote 替代**——基于 HTML 的所见即所得演示文稿工具。

## 特性

- **所见即所得编辑**：点击文字直接改，拖拽图片自由布局
- **Keynote 风格界面**：左侧幻灯片导航 + 右侧属性检查器
- **多文件支持**：新建/打开/删除演示文稿
- **模板系统**：深色科技 / 极简白 / 渐变紫，一键创建
- **演示模式**：一键全屏播放，ESC 回到编辑
- **保存到本地**：文件存储在 `presentations/` 目录
- **导出可分享**：导出独立 HTML 文件，任何人双击就能看

## 快速开始

```bash
# 启动
./start.sh
# 或
python3 server.py
```

浏览器访问：**http://localhost:3099**

## 目录结构

```
html-point/
├── server.py           # 主服务
├── start.sh            # 一键启动
├── README.md           # 本文件
├── presentations/      # 你的文稿（.html 文件）
├── templates/          # 内置模板
└── static/
    └── editor.js       # Keynote 风格编辑器
```

## 快捷键

| 键 | 功能 |
|---|------|
| **← →** | 前后翻页 |
| **Cmd/Ctrl + S** | 保存到文件 |
| **Cmd/Ctrl + Z** | 撤销文字编辑 |
| **Esc** | 退出编辑 / 退出全屏演示 |
| **B** | 切换静态/动态模式 |

## 导出分享

在编辑模式下点 **💾 保存**，文稿会保存到 `presentations/` 目录。把这个 `.html` 文件发给别人，双击即可观看（无需任何软件）。

## 技术栈

- 前端：原生 JavaScript + CSS（零框架依赖）
- 后端：Python 标准库（`http.server`）
- 存储：本地 `presentations/` 目录
