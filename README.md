# Markdown Preview

一个极简风格的 Markdown 文档预览站点，专为 GitHub Pages 设计，完全静态，无需后端。

## ✨ 特性

### 文档浏览

- 📂 **自动发现** — 自动扫描仓库中所有 `.md` 文件，构建文档目录树（含字数统计）
- 🔍 **全文搜索** — 基于 FlexSearch 的中文分词全文检索，结果关键词高亮
- 🔗 **Hash 路由** — 每个文档有独立 URL，支持分享和书签
- 🧭 **上一篇 / 下一篇** — 悬浮球快速翻阅相邻文档
- 📂 **打开本地 MD** — 临时预览本地 Markdown 文件，无需入库
- ⏱️ **阅读时间估算** — 自动计算预计阅读时长
- 📝 **Frontmatter** — 支持 YAML 元数据解析

### 渲染能力

- 🎨 **7 种内置主题** — 默认 / GitHub Light / GitHub Dark / Notion / Arc Dark / Dracula / Nord
- 🖼️ **图片灯箱** — 点击放大、缩放、键盘左右键翻页
- 📢 **GitHub 风格 Alerts** — 支持 `[!NOTE]` `[!WARNING]` 等提示语法
- 📋 **代码块增强** — 一键复制按钮、语言标签、横向滚动优化
- 📊 **长表格优化** — 自动包裹支持横向滚动
- 🔗 **标题锚点分享** — 标题悬浮出现复制链接按钮，直达章节

### 主题与外观

- 🎨 **可视化配色取色器** — 强调色 / 中性色独立调整，支持自定义亮色或暗色主题
- 💻 **代码高亮主题** — 10 种内置方案 + 自定义 highlight.js 主题 URL
- ✏️ **自定义 CSS** — 加载外部 CSS 文件进一步定制

### 输出与订阅

- 📄 **导出 PDF** — 通过浏览器打印对话框导出为 PDF
- 📡 **RSS 源** — 自动生成 `feed.xml`，支持 RSS 阅读器订阅
- 📲 **PWA 支持** — 可安装到桌面，离线访问已访问文档，更新时提示刷新

### 工程与开发

- 🔌 **插件系统** — 支持扩展自定义渲染器
- ✏️ **编辑此页** — 悬浮球快速跳转 GitHub 编辑页面
- 📱 **响应式设计** — 完美适配桌面端和移动端

### 内置编辑器

- 📝 **类 Jupyter Cell 编辑器** — 全屏覆盖层，按 Cell 编写并即时渲染 Markdown
- ⚡ **运行与预览** — 单 Cell 运行 / 运行全部 / 运行至下方，渲染管线与文档站一致
- 💾 **自动保存** — localStorage 1.5s 防抖保存，刷新不丢内容
- 🔍 **搜索替换** — 跨所有 Cell 查找、替换、跳转
- 🧩 **11 类自动补全** — `@` / ` ``` ` / `#` / `$$` / `![` 等触发字符即弹补全，120+ 条目
- 📋 **8 大工具栏菜单** — Markdown / HTML / 私有语法 / 工具渲染 / 插入 / 嵌入 / 下载 / 导入
- 🖱️ **2 列右键菜单** — 17 项 Cell 操作，视口边界自适应定位
- 📤 **导入导出** — `.md` / `.html` / `.pdf` / `.mdnb` 笔记本格式
- 🎨 **字号与主题** — 4 档字号、亮/暗主题独立切换

详见 [编辑器说明](docs/editor.md)。

## 🚀 快速开始

### GitHub Pages 部署

1. Fork 本仓库
2. 进入仓库 **Settings → Pages**
3. Source 选择 **GitHub Actions**
4. 修改 `iris/config.json` 中的 `owner` 和 `repo` 为你的信息
5. 推送代码，等待 GitHub Actions 自动构建部署

### 本地预览

```bash
# 克隆仓库
git clone <your-repo-url>
cd <repo-name>

# 构建文件树（可选，不构建则使用 GitHub API 回退）
node iris/scripts/build-file-tree.js

# 构建搜索索引
node iris/scripts/build-search-index.js

# 构建 RSS feed
node iris/scripts/build-feed.js

# 用浏览器打开 index.html
```

## ⚙️ 配置

修改 `iris/config.json` 自定义基础配置：

```json
{
  "owner": "your-username",
  "repo": "your-repo-name"
}
```

更多运行时配置（主题、配色、代码高亮、显示选项等）在站点右上角悬浮球 → 设置 中调整，详见 [配置参考](docs/configuration.md)。

## 📁 文档放置

在仓库任意位置创建 `.md` 文件即可，系统会自动发现并显示在侧边栏。推荐放在 `docs/` 目录下。

```
你的仓库/
├── README.md
├── docs/
│   ├── guide.md
│   ├── api/
│   │   └── reference.md
│   └── examples/
│       └── table-examples.md
└── ...
```

## 🎯 支持的渲染功能

| 功能 | 说明 |
|------|------|
| **Markdown 基础** | 标题、列表、表格、引用、代码块等 |
| **Mermaid 图表** | 流程图、时序图、甘特图等 18+ 种 |
| **PlantUML** | UML 图、架构图、思维导图等 |
| **ApexCharts** | 交互式折线图、柱状图、饼图等 |
| **LaTeX 公式** | 基于 KaTeX 的数学公式渲染 |
| **二维码** | 使用 `qrcode` 代码块生成二维码 |
| **Diff 可视化** | Git Diff 语法高亮对比 |
| **GeoJSON** | 基于 Leaflet 的地理数据地图 |
| **外部嵌入** | YouTube、Bilibili、Figma、CodePen 等 |
| **GitHub Alerts** | `[!NOTE]` `[!TIP]` `[!WARNING]` 等 |

更多示例请查看 [docs/examples/](docs/examples/)。

## 📂 项目结构

```
.
├── index.html              # 入口页面
├── manifest.json           # PWA 清单
├── sw.js                   # Service Worker
├── iris/
│   ├── app.js              # 应用入口
│   ├── config.json         # 用户配置
│   ├── styles.css          # 样式入口
│   ├── css/                # 模块化样式（含 editor.css 编辑器样式）
│   ├── js/                 # 核心功能模块（含 editor.js 编辑器）
│   ├── vendor/             # 第三方依赖（本地化）
│   ├── plugins/            # 插件目录
│   ├── icons/              # 图标资源
│   ├── data/               # 预构建数据（file-tree/search-index/feed）
│   └── scripts/            # 构建脚本（file-tree/search-index/feed）
├── docs/                   # 文档目录
│   ├── editor.md           # 编辑器说明
│   └── examples/           # 功能示例
└── .github/workflows/      # GitHub Actions
```

## 📚 文档

- [快速开始](docs/getting-started.md)
- [功能总览](docs/features.md)
- [编辑器说明](docs/editor.md)
- [配置参考](docs/configuration.md)
- [主题定制](docs/theme-customization.md)
- [代码高亮主题](docs/code-highlight-theme.md)
- [插件开发指南](docs/plugin-development.md)
- [RSS 订阅](docs/rss.md)
- [开发者文档](readme-dev.md)

## 📄 License

MIT
