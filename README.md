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
- 🌐 **Packet Tracer 拓扑** — 解析 Cisco `.pkt` 文件，渲染交互式网络拓扑图（基于 Cytoscape.js）

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
| **Packet Tracer** | Cisco .pkt 网络拓扑图渲染（Cytoscape.js） |
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
│   ├── data/               # 预构建数据（file-tree/search-index/feed/pkt）
│   └── scripts/            # 构建脚本（file-tree/search-index/feed/pkt）
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

## 🙏 致谢

本项目基于众多优秀的开源项目构建，在此向所有项目的作者和贡献者表示衷心感谢。

### 核心引擎

| 项目 | 用途 | 许可证 |
|------|------|--------|
| [marked](https://github.com/markedjs/marked) | Markdown 解析为 HTML 的核心引擎 | MIT |
| [highlight.js](https://github.com/highlightjs/highlight.js) | 代码块语法高亮（10 套主题） | BSD-3-Clause |
| [FlexSearch](https://github.com/nextapps-de/flexsearch) | 中文分词全文搜索引擎 | Apache-2.0 |

### 图表与可视化

| 项目 | 用途 | 许可证 |
|------|------|--------|
| [Mermaid](https://github.com/mermaid-js/mermaid) | 流程图、时序图、甘特图等 18+ 种图表 | MIT |
| [ApexCharts](https://github.com/apexcharts/apexcharts.js) | 交互式折线图、柱状图、饼图等 | MIT |
| [KaTeX](https://github.com/KaTeX/KaTeX) | LaTeX 数学公式渲染 | MIT |
| [Diff2Html](https://github.com/rtfpessoa/diff2html) | Git Diff 差异可视化 | MIT |
| [Cytoscape.js](https://github.com/cytoscape/cytoscape.js) | Packet Tracer 网络拓扑图渲染 | MIT |

### 地图与地理数据

| 项目 | 用途 | 许可证 |
|------|------|--------|
| [Leaflet](https://github.com/Leaflet/Leaflet) | GeoJSON / TopoJSON 地图渲染 | BSD-2-Clause |
| [OpenStreetMap](https://www.openstreetmap.org) | 地图瓦片数据服务 | ODbL |

### 工具库

| 项目 | 用途 | 许可证 |
|------|------|--------|
| [pako](https://github.com/nodeca/pako) | PlantUML 文本压缩（zlib） | MIT AND Zlib |
| [sharp](https://github.com/lovell/sharp) | PWA 图标生成（构建期） | Apache-2.0 |

### 图标与设计资源

| 项目 | 用途 | 许可证 |
|------|------|--------|
| [VMware Clarity Icons](https://github.com/vmware-archive/clarity-assets) | 网络设备图标（路由器/交换机/防火墙等） | MIT |
| [Tabler Icons](https://github.com/tabler/tabler-icons) | 设备图标补充 | MIT |
| [Geist UI Icons](https://github.com/vercel/geist-ui) | 文件树组件图标 | MIT |

### 字体

| 项目 | 用途 | 许可证 |
|------|------|--------|
| [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) | 标题衬线字体 | OFL 1.1 |
| [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) | 正文无衬线字体 | OFL 1.1 |
| [Google Fonts](https://fonts.google.com) | 字体分发服务 | — |

### 运行时服务

以下服务在运行时被调用，感谢其提供的公共服务：

- [PlantUML 公共服务器](https://plantuml.com) — UML 图表渲染
- [OpenStreetMap](https://www.openstreetmap.org) — 地图瓦片
- [Shields.io](https://shields.io) / [Badgen](https://badgen.net) — 徽章图生成
- [YouTube](https://youtube.com) / [Bilibili](https://bilibili.com) / [CodePen](https://codepen.io) / [Figma](https://figma.com) 等嵌入服务

## 📄 License

MIT
