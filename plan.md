# HTML Point 进化计划

## 目标
将 HTML Point 打磨至可应对 99% 的 HTML 格式幻灯片，具备常见 Keynote 功能，并提供 CLI 供 Agent 调用。

## 现有能力盘点
- ✅ WYSIWYG 编辑器（contenteditable + 拖拽）
- ✅ 3 套内置模板
- ✅ 幻灯片切换（fade / slide / zoom）
- ✅ 元素动画（11 种）
- ✅ 演讲者备注
- ✅ 逐条展示（Fragment）
- ✅ 计时器
- ✅ PDF 导出（打印样式）
- ✅ Command 撤销/重做
- ✅ 图片拖拽缩放
- ✅ 属性检查器
- ✅ 安全校验
- ✅ 文件管理（CRUD）
- ✅ 侧栏缩略图 + 拖拽排序
- ✅ WebGL 网格背景
- ✅ 瑞士风网格系统
- ✅ 内置导航/动画引擎（fallback）

## 待增强能力

### Stage 1: CLI 架构（核心）
- [ ] 创建 `html-point` CLI 入口
- [ ] 子命令: `init`, `build`, `serve`, `convert`, `export`, `theme`, `template`
- [ ] 支持 JSON/YAML/Markdown 输入生成 HTML 幻灯片
- [ ] Agent-friendly JSON Schema 输出
- [ ] 程序化 API（Python 模块）

### Stage 2: 布局系统扩展
- [ ] 新增 10+ 布局模板（Title, Title+Content, Two-Column, Three-Column, Image-Left, Image-Right, Full-Image, Comparison, Grid, Statement, Timeline, KPI, Chart, Code, Quote, Table, Video, Split, Cover, Blank）
- [ ] 网格预设系统（12列、6列、4列、3列、2列）
- [ ] 响应式断点支持

### Stage 3: 组件库增强
- [ ] 表格组件（支持简单数据表格）
- [ ] 代码块（语法高亮）
- [ ] 数学公式（KaTeX）
- [ ] 形状库（矩形、圆形、箭头、连接线）
- [ ] 图表扩展（饼图、折线图、面积图、雷达图）
- [ ] 视频/音频嵌入
- [ ] iframe 嵌入
- [ ] 图标系统（Lucide 扩展）

### Stage 4: 动画系统增强
- [ ] 新增 20+ 动画效果
- [ ] 动画时序控制（delay, duration, easing）
- [ ] 路径动画
- [ ] 组合动画序列
- [ ] 动画预设库

### Stage 5: 主题系统扩展
- [ ] 10+ 内置主题（科技、商务、学术、创意、极简、深色、瑞士、杂志、自然、节日）
- [ ] 自定义主题定义格式（YAML）
- [ ] 实时主题切换
- [ ] 字体组合预设

### Stage 6: 导出系统
- [ ] PDF 导出（Puppeteer/Playwright 无头模式）
- [ ] PNG/JPEG 逐页导出
- [ ] PPTX 导出（python-pptx）
- [ ] 演讲者模式打印（带备注）
- [ ] 静态站点生成（单页 SPA）

### Stage 7: 编辑器增强
- [ ] 形状绘制工具
- [ ] 表格编辑器
- [ ] 图表数据编辑器
- [ ] 全局搜索替换
- [ ] 幻灯片母版/布局管理
- [ ] 导入 PowerPoint（解析）
- [ ] 幻灯片过渡音效
- [ ] 激光笔模式

## 技术架构

```
html-point/
├── cli.py                      # CLI 入口
├── server.py                   # 保持现有 HTTP 服务
├── src/
│   ├── app.py                  # 现有路由
│   ├── storage.py              # 现有文件管理
│   ├── template.py             # 扩展模板系统
│   ├── security.py             # 现有安全校验
│   ├── editor_injector.py      # 现有注入器
│   ├── engine/                 # 新增：幻灯片引擎
│   │   ├── __init__.py
│   │   ├── builder.py          # 从数据构建 HTML
│   │   ├── parser.py           # 解析 JSON/YAML/Markdown
│   │   ├── layout.py           # 布局系统
│   │   ├── component.py        # 组件库
│   │   ├── theme.py            # 主题引擎
│   │   └── export.py           # 导出引擎
│   └── cli/                    # 新增：CLI 模块
│       ├── __init__.py
│       ├── commands.py         # 子命令实现
│       └── utils.py            # CLI 工具函数
├── web/                        # 前端（保持现有）
│   ├── index.html
│   ├── app.css
│   ├── editor.js               # 扩展编辑器
│   └── presenter.js            # 扩展示演器
├── templates/                  # 模板目录
│   ├── base.html               # 基础模板
│   ├── dark-tech.html
│   ├── light-minimal.html
│   ├── gradient-purple.html
│   └── ... (新增主题)
├── layouts/                    # 新增：布局片段
│   ├── title.html
│   ├── title-content.html
│   ├── two-column.html
│   ├── ...
├── components/                 # 新增：组件片段
│   ├── table.html
│   ├── chart.html
│   ├── code.html
│   ├── shape.html
│   └── ...
├── themes/                     # 新增：主题定义
│   ├── dark-tech.yml
│   ├── light-minimal.yml
│   └── ...
├── presentations/              # 演示文稿
└── tests/                      # 测试
```

## 执行顺序
1. 创建 `plan.md`（已完成）
2. 创建 CLI 入口和核心架构
3. 扩展模板/布局系统
4. 增强编辑器 JS（前端）
5. 增强演示器 JS（前端）
6. 创建导出引擎
7. 测试与验证
8. 更新 README
