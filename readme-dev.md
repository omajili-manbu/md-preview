# Markdown Preview - 开发者文档

面向希望深入了解或扩展本项目的开发者。

---

## 技术栈

| 技术 | 用途 |
|------|------|
| HTML5 | 页面结构 |
| CSS3 + CSS 变量 | 样式系统、响应式、主题 |
| Vanilla JavaScript | 核心逻辑，无框架依赖 |
| Node.js（仅构建） | 文件树、搜索索引、RSS feed 预构建 |
| GitHub Actions | CI/CD 自动部署 |
| Marked.js | Markdown 解析 |
| FlexSearch | 全文搜索（含 CJK 自定义编码器） |
| highlight.js | 代码语法高亮 |
| Mermaid.js | 图表渲染 |
| PlantUML | UML 图表 |
| ApexCharts | 交互式图表 |
| KaTeX | LaTeX 公式 |
| Leaflet.js | 地理数据地图 |
| diff2html | Git Diff 可视化 |
| Cytoscape.js | Packet Tracer 网络拓扑图渲染 |
| Python 3（仅构建） | .pkt 文件解密解析（零第三方依赖） |
| localStorage | 编辑器自动保存与偏好持久化 |

## 项目架构

### 目录结构

```
.
├── index.html              # 入口页面，声明库依赖
├── manifest.json           # PWA 应用清单
├── sw.js                   # Service Worker（离线缓存）
├── iris/
│   ├── app.js              # 应用入口，初始化各模块
│   ├── config.json         # 用户配置文件
│   ├── styles.css          # 样式入口（汇总各 CSS 模块）
│   ├── css/
│   │   ├── base.css        # 基础样式与 CSS 变量定义
│   │   ├── layout.css      # 布局（侧边栏、主内容区）
│   │   ├── components.css  # 组件样式（含打印样式）
│   │   ├── markdown.css    # Markdown 渲染样式
│   │   ├── floating.css    # 悬浮球与浮动元素
│   │   ├── responsive.css  # 响应式适配
│   │   ├── editor.css      # 编辑器页面样式（工具栏 / Cell / 右键菜单 / 补全列表）
│   │   └── themes/
│   │       └── themes.css  # 7 种内置主题
│   ├── js/
│   │   ├── config.js       # 配置加载模块
│   │   ├── state.js        # 全局状态管理
│   │   ├── dom.js          # DOM 元素引用
│   │   ├── ui.js           # UI 工具与事件监听
│   │   ├── file-tree.js    # 文件树加载与渲染（Shadow DOM 滚动条隐藏）
│   │   ├── markdown.js     # Markdown 渲染、代码块复制、灯箱、标题锚点
│   │   ├── search.js       # FlexSearch 全文搜索（关键词高亮）
│   │   ├── router.js       # Hash 路由
│   │   ├── settings.js     # 设置面板、悬浮菜单、PDF 导出、本地 MD、编辑器入口
│   │   ├── editor.js       # 内置 Markdown 编辑器（Cell / 自动保存 / 补全 / 搜索替换）
│   │   ├── debug.js        # 调试模式
│   │   ├── themes/
│   │   │   └── theme-manager.js  # 主题管理器（预设/自定义 CSS/hljs）
│   │   ├── plugins/
│   │   │   └── loader.js   # 插件加载器
│   │   ├── renderers/      # 扩展渲染器
│   │   │   ├── mermaid.js
│   │   │   ├── plantuml.js
│   │   │   ├── apexcharts.js
│   │   │   ├── katex.js
│   │   │   ├── diff.js
│   │   │   ├── geo.js
│   │   │   └── embedded.js
│   │   └── pkt/
│   │       └── pkt-renderer.js  # Packet Tracer 拓扑渲染器
│   ├── vendor/             # 第三方依赖（本地化，无 CDN）
│   │   ├── marked.js
│   │   ├── flexsearch.bundle.js
│   │   ├── highlight.js/
│   │   ├── mermaid.min.js
│   │   ├── apexcharts.min.js
│   │   ├── pako.min.js
│   │   ├── katex/
│   │   ├── leaflet/
│   │   ├── cytoscape/       # Cytoscape.js（拓扑图）
│   │   └── diff2html/
│   ├── plugins/            # 自定义插件
│   │   └── qrcode.js
│   ├── icons/              # PWA 图标资源
│   ├── data/               # 预构建数据
│   │   ├── file-tree.json
│   │   ├── search-index.json
│   │   ├── feed.xml        # RSS 2.0 feed
│   │   └── pkt/            # Packet Tracer 拓扑数据
│   │       ├── raw/         # .pkt 原始文件
│   │       ├── xml/         # 解密解压后的 XML
│   │       ├── json/        # 解析后的拓扑 JSON
│   │       └── icons.svg    # 设备类型 SVG 图标
│   └── scripts/            # 构建脚本
│       ├── build-file-tree.js
│       ├── build-search-index.js
│       ├── build-feed.js   # RSS feed 生成
│       └── pkt/            # .pkt 解密解析（Python）
│           ├── decrypt.py   # XOR + Twofish EAX 解密
│           ├── decompress.py # zlib 解压
│           ├── parse.py     # XML + IOS 配置解析
│           ├── output.py    # JSON 输出
│           └── main.py      # 主入口（mtime 增量）
├── docs/
│   └── examples/           # 功能示例文档
└── .github/workflows/
    ├── build-and-deploy.yml     # 主部署流程
    ├── build-search-index.yml   # 搜索索引构建
    ├── build-feed.yml           # RSS feed 构建
    ├── build-pkt.yml            # PKT 拓扑构建
    └── sync-to-product.yml      # product 分支同步
```

### 模块依赖关系

```
app.js (入口)
  ├── file-tree.js     # 文件树加载
  ├── ui.js            # UI 事件
  ├── search.js        # FlexSearch 全文搜索
  ├── router.js        # Hash 路由
  ├── debug.js         # 调试面板
  ├── markdown.js      # Markdown 渲染（代码块/灯箱/锚点）
  │     ├── renderers/ # 各扩展渲染器（含 embedded.js → pkt-renderer.js）
  │     └── plugins/   # 自定义插件
  ├── themes/          # 主题管理（自定义 CSS/hljs）
  ├── settings.js      # 设置面板、悬浮菜单、PDF 导出、编辑器入口
  └── editor.js        # 内置 Markdown 编辑器（按需初始化）
        └── 复用 markdown.js 渲染管线
```

### 核心模块说明

#### `config.js` — 配置加载

从 `iris/config.json` 加载用户配置，与默认配置深度合并。加载失败时使用默认配置兜底。

#### `file-tree.js` — 文件树

双重加载策略：
1. 优先加载预构建的 `iris/data/file-tree.json`（无 API 限制，速度快）
2. 不存在则回退到 GitHub API（`recursive=1` 获取完整树）

特性：
- 自动过滤 `.md` 文件，构建嵌套目录结构
- 每个文件附带字数统计
- 文件树区域使用 Shadow DOM 隔离样式，并隐藏滚动条保持视觉简洁
- 提供 `getAdjacentFiles(path)` 接口，返回上/下一篇文档（供悬浮菜单使用）
- 可在设置面板切换是否显示字数统计、是否截断长文件名

#### `markdown.js` — Markdown 渲染

渲染管道：
1. Marked.js 解析 Markdown（自定义 `renderer.code` 注入复制按钮、语言标签）
2. 处理 Frontmatter（YAML 元数据）
3. 动态更新 `document.title`（用于 SEO 与浏览器标签）
4. 处理 GitHub Alerts
5. 图片增强（懒加载、画廊、错误降级、灯箱）
6. 长表格自动包裹 `.table-wrapper` 支持横向滚动
7. 标题锚点分享按钮（H1~H6 悬浮出现复制链接）
8. 调用各扩展渲染器（Mermaid、KaTeX 等）
9. 调用插件渲染

代码块增强：
- 每个 `<pre>` 注入复制按钮（Clipboard API + `execCommand` 兜底）
- 顶部显示语言标签 `.code-lang-label`
- `data-lang` 属性记录语言便于扩展

灯箱（lightbox）：
- 点击图片打开全屏灯箱
- 支持滚轮缩放、左右键翻页、Esc 关闭
- 自动收集当前文档所有图片，支持画廊模式

#### `search.js` — 全文搜索

基于 FlexSearch，特性：
- 预构建索引（`iris/data/search-index.json`），无索引时回退到运行时构建
- 自定义 CJK 编码器，支持中文分词与模糊匹配
- 标题 + 正文 + 路径三字段复合索引
- 搜索结果关键词高亮（`<mark>` 标签包裹）
- 直接使用索引中的完整 `path`，避免硬编码前缀拼接

#### `theme-manager.js` — 主题系统

基于 CSS 变量，特性：
- 7 种内置主题（default / github-light / github-dark / notion / arc / dracula / nord）
- 自定义 CSS（加载外部 URL）
- 自定义 highlight.js 主题 CSS（独立输入框，加载后插入到 `#hljs-theme` 之后确保覆盖）
- 通过 localStorage 持久化

#### `settings.js` — 设置面板与悬浮菜单

设置面板分组：
- **外观**：预设主题 / 自定义配色（取色器：强调色 + 中性色）/ 代码高亮主题 / 高级（自定义 CSS、自定义 hljs）
- **功能**：显示选项（阅读进度、字数统计、文件名截断）
- **操作**：下载当前 MD、导出 PDF

悬浮球菜单（7 个入口）：
1. 回到顶部
2. 上一篇
3. 下一篇
4. 打开本地 MD（FileReader 读取，不写进 URL，刷新后丢失）
5. 安装到桌面（PWA，仅 `beforeinstallprompt` 触发时显示）
6. 编辑此页（跳转 GitHub 编辑页面）
7. 设置

导出 PDF：通过 `window.print()` 触发浏览器打印对话框，配合 `@media print` 样式隐藏侧边栏/悬浮球等 UI 元素。

#### `editor.js` — 内置 Markdown 编辑器

类 Jupyter 的 Cell 化编辑器，以全屏覆盖层形式叠加在文档站之上。详细使用说明见 [编辑器说明](docs/editor.md)。

**入口与生命周期**：
- 通过 URL `?mode=editor`、设置面板「打开编辑器」按钮或 `MarkdownPreview.enterEditorMode()` 进入
- 首次进入时调用 `initEditor()` 初始化（懒加载，避免影响首屏）
- `exitEditorMode()` 退出并清理 URL 参数
- 复用 `markdown.js` 的渲染管线，渲染结果与文档站完全一致

**核心数据结构**：
```javascript
cells = [{
  id, div, textarea, output, outputToolbar, lineNumbers,
  statusDot, linesLabel, typeBadge, collapseBtn,
  type,            // 'markdown' | 'plaintext'
  lastRunContent   // 上次运行内容，用于检测「已修改」状态
}]
```

**主要功能模块**：
- **Cell 管理**：`createCell` / `deleteCell` / `renumberCells` / `rebuildCellDOMOrder`
- **运行**：`runCell` / `runAllCells` / `runCellBelow`，调用 `MarkdownPreview.renderMarkdown` 渲染到 `.cell-output`
- **自动补全**：11 类触发字符（`@` / ` ``` ` / `> [!` / `#` / `-` / `|` / `---` / `>` / `$$` / `![` / `[`），70+ 条目
- **右键菜单**：2 列布局 17 项操作，`showContextMenu` 四方向边界检测定位
- **搜索替换**：跨所有 Cell textarea 的查找 / 替换 / 全部替换 / F3 导航
- **格式化**：`applyFormat` 支持粗体 / 斜体 / 删除线 / 行内代码 / H1~H3 / 链接 / 引用 / 列表
- **导入导出**：`.md` / `.html` / 内联 CSS HTML / `.pdf` / `.mdnb` 笔记本 / 合并 `.md`
- **自动保存**：localStorage `mdnb_autosave_v2`，1.5s 防抖，序列化所有 Cell 的 id/type/content/output_html

**持久化键**：
| 键 | 用途 |
|----|------|
| `mdnb_autosave_v2` | 笔记本自动保存（cells 数组） |
| `mdnb_fontsize` | 编辑区字号（12/14/16/18） |
| `mdnb_theme` | 编辑器主题（light/dark） |

**全局 API**：
- `MarkdownPreview.enterEditorMode()` — 进入编辑器
- `MarkdownPreview.exitEditorMode()` — 退出编辑器

**样式**：`iris/css/editor.css`，包含工具栏、Cell、右键菜单、补全列表、搜索面板、选中浮动工具栏、状态栏等全部样式。

#### `pkt-renderer.js` — Packet Tracer 拓扑渲染

基于 Cytoscape.js 渲染 Cisco Packet Tracer 网络拓扑图，通过 `@[pkt](name)` 嵌入语法触发（由 `embedded.js` 调用）。

**渲染流程**：
1. `loadAndRender(container, jsonPath)` — 从 `iris/data/pkt/json/` 拉取 JSON
2. `renderTopology(container, jsonData)` — 构建 DOM + 初始化 Cytoscape 实例
3. 设备节点使用 SVG data-URI 图标（13 种类型），连线按线缆类型着色

**交互**：
- 节点点击 → `openDrawer(node)` 弹出右侧抽屉，5 标签页（接口表 / 配置 / VLAN / ACL / 路由）
- 搜索框 → 按设备名 / IP / 类型过滤，匹配高亮 + 非匹配淡出
- 工具栏 → PT 坐标布局 ↔ 力导向布局 / 网格切换 / 适配视图 / 导出（PNG / JSON / Markdown）
- 连线 hover → tooltip 显示接口和线缆信息

**全局 API**：`MarkdownPreview.pkt.loadAndRender(el, name)`

**样式**：`iris/css/pkt/pkt.css`，含拓扑容器、工具栏、画布、抽屉、标签页、接口表、IOS 语法高亮、移动端响应式（抽屉底部弹出 70vh）。

### 插件系统

插件接口（v2）：

```javascript
export default {
  name: 'plugin-name',
  description: '插件描述',
  priority: 10,                 // 优先级，数值越大越优先

  // 生命周期：初始化
  init(config) { },

  // 判断逻辑（可选，默认精确匹配 language === name）
  test(code, language) {
    return language === 'my-language';
  },

  // 渲染前/后钩子（可选）
  beforeRender(code, container, context) { },
  afterRender(container, context) { },

  // 渲染（支持同步或 async）
  async render(code, container, context) {
    container.innerHTML = '...';
  },

  // 销毁钩子（可选）
  destroy() { }
};
```

**上下文对象 `context`**：

| 字段 | 说明 |
|------|------|
| `language` | 代码块语言标识 |
| `documentPath` | 当前文档路径 |
| `config` | 来自 `config.json` 的插件专属配置 |
| `registerResource` | 注册可清理资源（需实现 `destroy()`） |

**插件加载策略**（按优先级）：

1. `config.plugins.manifest` — 显式 URL 列表，最可靠
2. `iris/plugins/directory.json` — 预构建索引文件
3. 目录扫描 — 回退到 `fetch('iris/plugins/')`（部分静态托管不支持）

将插件文件放入 `iris/plugins/` 目录，插件加载器会自动发现并注册。详见 [插件开发指南](docs/plugin-development.md)。

## 部署与构建

### GitHub Pages 部署

工作流：`build-and-deploy.yml`

1. 推送代码到 `main` 分支触发
2. 运行 `iris/scripts/build-file-tree.js` 预构建文件树
3. 上传整个仓库为 Pages Artifact
4. 部署到 GitHub Pages

### 搜索索引构建

工作流：`build-search-index.yml`

- 当 `docs/**` 路径下文件变更时触发
- 运行 `iris/scripts/build-search-index.js` 生成搜索索引
- 提交并推送到仓库

### RSS Feed 构建

工作流：`build-feed.yml`

- 当 `docs/**` 路径下文件变更时触发，或手动 `workflow_dispatch`
- `fetch-depth: 0` 拉取完整 git 历史（用于读取文件提交时间）
- 运行 `iris/scripts/build-feed.js` 生成 `iris/data/feed.xml`
- 提交并推送到仓库

### Packet Tracer 拓扑构建

工作流：`build-pkt.yml`

- 当 `iris/data/pkt/raw/` 或 `iris/scripts/pkt/` 下文件变更时触发
- 设置 Python 3.11，运行 `iris/scripts/pkt/main.py --verbose`
- 管线：XOR/Twofish 解密 → zlib 解压 → XML 解析 → IOS 配置提取 → JSON 输出
- mtime 增量构建（仅处理变更的 .pkt 文件）
- 提交生成的 JSON 和 XML 到仓库

### Product 分支同步

工作流：`sync-to-product.yml`

- 推送 `main` 时触发
- 创建 `product` 分支，移除所有 `.md` 文件
- 用于纯应用发布（不含文档）

## PWA

配置文件：
- `manifest.json` — 应用清单（名称、图标、启动 URL）
- `sw.js` — Service Worker（离线缓存）

特性：
- 可安装到桌面/手机主屏幕
- 预缓存首屏关键静态资源
- 静态资源缓存优先、后台更新；Markdown 文档网络优先、离线降级到缓存
- 资源更新时弹出 toast 提示用户刷新
- 安装按钮集成在悬浮球菜单中

## 本地开发

```bash
# 构建文件树
node iris/scripts/build-file-tree.js

# 构建搜索索引
node iris/scripts/build-search-index.js

# 构建 RSS feed
node iris/scripts/build-feed.js

# 构建 Packet Tracer 拓扑（需 Python 3）
python3 iris/scripts/pkt/main.py --verbose

# 用浏览器直接打开 index.html 即可预览
```

## 样式开发

CSS 采用模块化架构，按功能拆分到 `iris/css/` 目录下的各文件中，最终通过 `iris/styles.css` 汇总。

主题通过 CSS 变量实现，新增主题只需在 `iris/css/themes/themes.css` 中添加新的 `[data-theme="xxx"]` 选择器并定义变量。运行时主题色由 `settings.js` 通过 `root.style.setProperty` 动态覆盖。

打印样式位于 `iris/css/components.css` 的 `@media print` 段，导出 PDF 时复用。

## 调试模式

访问 URL 时添加 `?debug=1` 参数，右下角会显示调试面板，每 2 秒自动刷新，包含 6 个分组：

### 环境
- 浏览器（解析 UA）
- 视口尺寸 + DPR
- 平台、语言
- 在线状态、连接类型（4g/wifi 等）

### 性能
- 首屏耗时（自 `?debug=1` 启用时刻）
- TTFB / DOM Ready / Load（Performance Timing API）
- FCP（PerformanceObserver `first-contentful-paint`）
- JS 堆内存 / 总堆内存 / 堆上限（Chrome only，`performance.memory`）

### 当前文档
- 路径、源大小、HTML 大小、渲染耗时
- 标题数 / 图片数 / 代码块数 / 表格数 / 链接数（DOM 查询）
- Frontmatter 字段列表

### 文件树 & 搜索
- 文件总数（递归统计 `state.fileTreeData`）
- 加载来源（`prebuilt` / `api`）
- 搜索索引来源（`prebuilt` / `runtime`）
- 索引条目数、搜索引擎（FlexSearch / simple）

### 主题
- 当前主题、代码主题
- 自定义色数（localStorage 中实际生效的颜色数）
- 自定义 CSS / 自定义 hljs 是否启用

### 缓存与网络
- API 调用次数、缓存命中（命中 / 调用）
- LocalStorage 占用字节数
- Service Worker 状态（activated / 未注册 / 不支持）

实现：[iris/js/debug.js](iris/js/debug.js)，相关状态字段定义在 [iris/js/state.js](iris/js/state.js)（`fileTreeSource` / `searchIndexStats` / `lastDocStats`）。

---

**文档版本**: 3.3
