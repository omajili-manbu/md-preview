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
│   │   ├── settings.js     # 设置面板、悬浮菜单、PDF 导出、本地 MD
│   │   ├── debug.js        # 调试模式
│   │   ├── themes/
│   │   │   └── theme-manager.js  # 主题管理器（预设/自定义 CSS/hljs）
│   │   ├── plugins/
│   │   │   └── loader.js   # 插件加载器
│   │   └── renderers/      # 扩展渲染器
│   │       ├── mermaid.js
│   │       ├── plantuml.js
│   │       ├── apexcharts.js
│   │       ├── katex.js
│   │       ├── diff.js
│   │       ├── geo.js
│   │       └── embedded.js
│   ├── vendor/             # 第三方依赖（本地化，无 CDN）
│   │   ├── marked.js
│   │   ├── flexsearch.bundle.js
│   │   ├── highlight.js/
│   │   ├── mermaid.min.js
│   │   ├── apexcharts.min.js
│   │   ├── pako.min.js
│   │   ├── katex/
│   │   ├── leaflet/
│   │   └── diff2html/
│   ├── plugins/            # 自定义插件
│   │   └── qrcode.js
│   ├── icons/              # PWA 图标资源
│   ├── data/               # 预构建数据
│   │   ├── file-tree.json
│   │   ├── search-index.json
│   │   └── feed.xml        # RSS 2.0 feed
│   └── scripts/            # 构建脚本
│       ├── build-file-tree.js
│       ├── build-search-index.js
│       └── build-feed.js   # RSS feed 生成
├── docs/
│   └── examples/           # 功能示例文档
└── .github/workflows/
    ├── build-and-deploy.yml     # 主部署流程
    ├── build-search-index.yml   # 搜索索引构建
    ├── build-feed.yml           # RSS feed 构建
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
  │     ├── renderers/ # 各扩展渲染器
  │     └── plugins/   # 自定义插件
  ├── themes/          # 主题管理（自定义 CSS/hljs）
  └── settings.js      # 设置面板、悬浮菜单、PDF 导出
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

### 插件系统

插件接口：

```javascript
export default {
  name: 'plugin-name',
  description: '插件描述',
  
  test(code, language) {
    return language === 'my-language';
  },
  
  render(code, container) {
    container.innerHTML = '...';
  }
};
```

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

# 用浏览器直接打开 index.html 即可预览
```

## 样式开发

CSS 采用模块化架构，按功能拆分到 `iris/css/` 目录下的各文件中，最终通过 `iris/styles.css` 汇总。

主题通过 CSS 变量实现，新增主题只需在 `iris/css/themes/themes.css` 中添加新的 `[data-theme="xxx"]` 选择器并定义变量。运行时主题色由 `settings.js` 通过 `root.style.setProperty` 动态覆盖。

打印样式位于 `iris/css/components.css` 的 `@media print` 段，导出 PDF 时复用。

## 调试模式

访问 URL 时添加 `?debug=1` 参数，右上角会显示调试面板，包含：
- 加载耗时
- 文件数量
- 搜索索引状态
- 内存使用

---

**文档版本**: 3.0
