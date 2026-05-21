# Markdown Preview - 开发者文档

本文档面向希望深入了解或扩展本项目的开发者。

---

## 0. 部署说明

### 0.1 GitHub Pages 部署（推荐）

项目使用 GitHub Action 自动构建和部署，完全避免 GitHub API 限流问题。

#### 0.1.1 部署流程

1. **Fork 仓库**
2. **配置仓库
   - 进入 Settings → Pages
   - 源选择 GitHub Actions
3. **自定义配置
   - 修改 `js/config.js` 中的 `CONFIG.owner` 和 `CONFIG.repo`
4. **推送代码，自动部署

#### 0.1.2 工作原理

```
代码推送 → GitHub Action 触发
       → 运行 build-file-tree.js 扫描 .md 文件
       → 生成 data/file-tree.json
       → 部署到 GitHub Pages
       → 前端优先从预构建文件读取，无 API 限制
```

#### 0.1.3 本地测试

```bash
node scripts/build-file-tree.js
```

### 0.2 回退机制

如果预构建文件不存在，系统会自动回退到 GitHub API（有限制）。

---

## 1. 项目架构总览

### 1.1 技术栈

| 技术 | 用途 |
|------|------|
| **HTML5** | 页面结构，语义化标签 |
| **CSS3** | 样式系统，响应式设计，CSS 变量 |
| **Vanilla JavaScript** | 核心功能，无框架依赖 |
| **Node.js (仅构建)** | 文件树和搜索索引预构建 |
| **GitHub Actions** | 自动 CI/CD |
| **Marked.js** | Markdown 解析 |
| **Mermaid.js** | 流程图、时序图等图表渲染 |
| **PlantUML** | 多种 UML 和非 UML 图 |
| **ApexCharts** | 交互式图表 |
| **Leaflet.js** | 地理数据可视化 |
| **abcjs** | ABC 音乐记谱法渲染 |
| **Verovio** | MusicXML 乐谱渲染 |
| **OSMD** | OpenSheetMusicDisplay 乐谱渲染 |
| **diff2html** | Git Diff 可视化 |

### 1.2 核心文件结构

```
md-preview/
├── index.html          # 主页面结构，库依赖声明
├── app.js             # 入口文件，初始化应用
├── styles.css         # 完整样式系统
├── README.md          # 用户文档
├── readme-dev.md     # 本文档（开发者文档）
├── js/                # 核心模块目录
│   ├── config.js      # 配置文件
│   ├── state.js       # 状态管理
│   ├── dom.js         # DOM 元素引用
│   ├── ui.js          # UI 工具函数
│   ├── file-tree.js   # 文件树加载和渲染
│   ├── markdown.js    # Markdown 渲染和处理
│   ├── search.js      # 全文搜索功能
│   ├── router.js      # Hash 路由管理
│   └── renderers/     # 扩展功能渲染器
│       ├── mermaid.js
│       ├── plantuml.js
│       ├── apexcharts.js
│       ├── music-notation.js
│       ├── diff.js
│       ├── geo.js
│       └── embedded.js
├── scripts/
│   ├── build-file-tree.js   # 文件树预构建脚本
│   └── build-search-index.js  # 搜索索引预构建脚本
├── data/
│   └── file-tree.json      # 预构建的文件树（由 Action 生成）
├── search-index.json       # 预构建的搜索索引（由 Action 生成）
└── .github/
    └── workflows/
        ├── build-and-deploy.yml       # GitHub Action 配置
        └── build-search-index.yml    # 搜索索引自动构建
```

### 1.3 架构特点

- **纯前端架构**：无需后端，所有逻辑在浏览器运行
- **预构建优化**：文件树预部署，避免 GitHub API 限流
- **模块化设计**：使用 IIFE 模式避免全局污染
- **事件驱动**：通过事件委托处理用户交互
- **异步渲染**：Markdown 解析和内容渲染分离

---

## 2. 模块化架构分析

### 2.1 模块结构

项目采用 IIFE（立即调用函数表达式）模式，将功能拆分为独立模块，通过 `window.MarkdownPreview` 全局对象进行通信。

```
模块依赖关系：
┌─────────────────────────────────────────────────────────┐
│                     app.js (入口)                       │
│  初始化：fileTree.loadFileTree() + ui.setupEventListeners() + search.init() │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  file-tree.js    │    │    ui.js         │
│  - 文件树加载    │    │  - UI 工具       │
│  - 目录渲染      │    │  - 事件监听      │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └──────────┬────────────┘
                    ▼
         ┌──────────────────┐
         │   markdown.js    │
         │  - Markdown 渲染 │
         │  - Frontmatter   │
         │  - 面包屑导航    │
         │  - 编辑按钮      │
         └────────┬─────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
   ┌──────────┐    ┌──────────────┐
   │ renderers│    │  dom.js      │
   │  目录    │    │  DOM 引用    │
   └────┬─────┘    └──────┬───────┘
        │                 │
   ┌────┴─────┐    ┌──────┴───────┐
   │          │    │              │
   ▼          ▼    ▼              ▼
mermaid   plantuml  state.js    config.js
(其他渲染器...)
                      │
                      │    ┌──────────────┐
                      │    │  search.js    │
                      │    │  - 搜索功能   │
                      │    └──────┬───────┘
                      │           │
                      │    ┌──────┴───────┐
                      │    │  router.js   │
                      │    │  - 路由管理  │
                      │    └──────────────┘
```

### 2.2 核心模块详解

#### 2.2.1 配置模块 (`js/config.js`)

**功能**：集中管理项目配置
```javascript
window.MarkdownPreview.CONFIG = {
  owner: 'theforeveriris',
  repo: 'md-preview'
};
```

**特点**：
- 独立配置，易于修改
- 其他模块通过 `window.MarkdownPreview.CONFIG` 访问

#### 2.2.2 状态管理模块 (`js/state.js`)

**功能**：全局状态集中管理
```javascript
window.MarkdownPreview.state = {
  fileTreeData: [],       // 文件树数据
  currentMode: 'files',    // 当前模式
  currentFilePath: '',     // 当前文件
  currentHeadings: []    // 标题列表
};
```

#### 2.2.3 DOM 引用模块 (`js/dom.js`)

**功能**：统一管理 DOM 元素引用，避免重复查询

```javascript
window.MarkdownPreview.dom = {
  fileTree: document.getElementById('fileTree'),
  markdownContent: document.getElementById('markdownContent'),
  // ...其他元素
};
```

#### 2.2.4 文件树模块 (`js/file-tree.js`)

**功能**：双重策略加载文件树
1. **优先使用预构建文件** - 无 API 限制，性能最佳
2. **回退到 GitHub API** - 作为备用方案

```javascript
async function loadFileTree() {
  try {
    // 首先尝试加载预构建的文件树
    const prebuiltUrl = './data/file-tree.json';
    let response = await fetch(prebuiltUrl);
    
    if (response.ok) {
      console.log('✅ 使用预构建的文件树');
      fileTreeData = await response.json();
      renderFileTree(fileTreeData);
      return;
    } else {
      console.log('⚠️ 预构建文件不存在，使用 GitHub API');
      await loadFileTreeFromGitHubAPI();
    }
  } catch (error) {
    console.error('⚠️ 加载预构建文件树失败，使用 GitHub API:', error);
    await loadFileTreeFromGitHubAPI();
  }
}

async function loadFileTreeFromGitHubAPI() {
  // GitHub API 回退方案
  const apiUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees/main?recursive=1`;
  const response = await fetch(apiUrl);
  const data = await response.json();
  fileTreeData = buildTreeFromFlatList(data.tree);
  renderFileTree(fileTreeData);
}
```

**特点**：
- 预构建优先，完全避免 API 限流
- 自动回退，保持兼容性
- 使用 `recursive=1` 获取完整树结构
- 自动过滤 `.md` 文件
- 递归构建目录结构

#### 2.2.5 目录树构建算法 (`buildTreeFromFlatList`)

**输入**：GitHub API 返回的扁平文件列表

```javascript
function buildTreeFromFlatList(tree) {
  // 使用 Map 缓存已创建的文件夹
  const map = {};
  const root = [];
  
  // 遍历每个 .md 文件
  tree.forEach(item => {
    const parts = item.path.split('/');
    // 逐层创建或复用目录节点
  });
  
  // 递归排序（文件夹优先，按名称排序）
  sortTree(root);
  return root;
}
```

**算法特点**：
- 时间复杂度：O(n log n)
- 空间复杂度：O(n)
- 使用 Map 避免重复创建目录节点

#### 2.2.6 Markdown 渲染模块 (`js/markdown.js`)

**功能**：Markdown 文件加载、渲染和链接拦截

**渲染管道**（至关重要）：
```javascript
setTimeout(() => {
  window.MarkdownPreview.renderers.apexcharts.render();
  window.MarkdownPreview.renderers.musicNotation.render();
  window.MarkdownPreview.renderers.diff.render();
  window.MarkdownPreview.renderers.mermaid.render();
  window.MarkdownPreview.renderers.plantuml.render();
  window.MarkdownPreview.renderers.geo.render();
  window.MarkdownPreview.renderers.embedded.render();
}, 100);
```

#### 2.2.7 渲染器模块 (`js/renderers/`)

每个渲染器都是独立模块，提供统一的 `render()` 接口：
- `mermaid.js` - Mermaid 图表
- `plantuml.js` - PlantUML 图表
- `apexcharts.js` - ApexCharts 图表
- `music-notation.js` - 乐谱渲染
- `diff.js` - Diff 可视化
- `geo.js` - 地理数据可视化
- `embedded.js` - 外部服务嵌入

**为什么用 setTimeout(100ms)**：
1. 等待 Marked.js 完成 HTML 转换
2. 确保 DOM 完全渲染
3. 避免异步渲染竞态条件

#### 2.2.8 代码块渲染策略

所有代码块渲染器采用统一模式：

```javascript
function renderXXXDiagrams() {
  const allPres = document.querySelectorAll('.markdown-body pre');
  
  // 关键：反向遍历
  for (let i = allPres.length - 1; i >= 0; i--) {
    const pre = allPres[i];
    const codeElement = pre.querySelector('code');
    
    // 检查代码块类型
    if (!codeElement.className.includes('language-xxx')) continue;
    
    // 创建容器
    const container = document.createElement('div');
    
    // 替换 DOM（关键操作）
    pre.parentNode.replaceChild(container, pre);
    
    // 执行渲染
    try {
      renderLogic(codeElement.textContent, container);
    } catch (error) {
      showError(container, error);
    }
  }
}
```

**为什么要反向遍历**：
- 正向遍历时，替换第一个元素后，数组索引会错位
- 反向遍历确保即使修改 DOM 也不影响未处理元素

#### 2.2.9 PlantUML 编码 (`encodePlantUML`)

```javascript
function encode64(data) {
  // 1. 将 UTF-8 字节数组压缩
  const compressed = pako.deflateRaw(utf8);
  // 2. 转换为 PlantUML 特殊 Base64
  return encode64(compressed);
}
```

**最终 URL**：`https://www.plantuml.com/plantuml/svg/${encoded}`

#### 2.2.10 ApexCharts 配置

```javascript
function renderApexCharts() {
  const chartConfig = JSON.parse(codeElement.textContent);
  const chart = new ApexCharts(element, {
    ...chartConfig,
    chart: { ...chartConfig.chart, toolbar: { show: true } },
    colors: chartConfig.colors || ['#8B5CF6', '#D946EF', ...],
    theme: { mode: 'light' }
  });
  chart.render();
}
```

**关键点**：
- 用户只需提供简化配置
- 系统自动补充默认样式和配色

#### 2.2.11 外部服务嵌入

**支持的嵌入语法**：
```markdown
@[youtube](视频ID)
@[bilibili](BV号)
@[figma](设计稿链接)
@[codepen](代码演示链接)
```

**实现原理**：
```javascript
const embedRegex = /@\[(\w+)\]\(([^)]+)\)/g;

while ((match = embedRegex.exec(content)) !== null) {
  const service = match[1];  // 服务类型
  const url = match[2];       // 资源 URL
  
  // 根据服务类型生成 iframe
  const iframe = createEmbedIframe(service, url);
  content = content.replace(match[0], iframe);
}
```

#### 2.2.12 地理数据渲染

**支持格式**：
- GeoJSON
- TopoJSON（需要转换为 GeoJSON）

**渲染流程**：
1. 解析 JSON 数据
2. 创建 Leaflet 地图容器
3. 加载 OpenStreetMap 瓦片
4. 添加 GeoJSON 图层
5. 自动适应边界

**TopoJSON 转换**：
```javascript
function topojsonToGeoJson(topology) {
  // 解码 arcs
  function decodeArc(arcIndex) {
    // 累加坐标变换
  }
  
  // 转换几何类型
  function transformGeometry(geometry) {
    // Point, LineString, Polygon, Multi-* 等
  }
}
```

#### 2.2.13 乐谱渲染

**支持三种格式**：

| 格式 | 代码块类型 | 渲染库 | 特点 |
|------|-----------|--------|------|
| ABC 记谱法 | `abc` | abcjs | 文本格式，适合简单旋律 |
| MusicXML | `musicxml` | Verovio | XML 格式，专业乐谱 |
| MusicXML | `osmd` | OSMD | 现代化渲染效果 |

**渲染策略**：
```javascript
if (classList.includes('language-abc')) {
  renderABCNotation(code, container, pre);
} else if (classList.includes('language-musicxml')) {
  renderMusicXML(code, container, pre);
} else if (classList.includes('language-osmd')) {
  renderOSMD(code, container, pre);
}
```

### 2.3 状态管理

状态已封装在 `js/state.js` 中，全局访问：
```javascript
window.MarkdownPreview.state = {
  fileTreeData: [],       // 文件树数据
  currentMode: 'files',    // 当前模式：files/index
  currentFilePath: '',     // 当前文件路径
  currentHeadings: []    // 当前文件的标题列表
};
```

**状态更新时机**：
- `fileTreeData`：首次加载或仓库结构变化时
- `currentFilePath`：加载新 Markdown 文件时
- `currentHeadings`：Markdown 内容变化时

### 2.4 事件处理

**主要事件**：
1. **点击文件** → 加载并渲染 Markdown
2. **切换模式** → Files/Index 模式切换
3. **滚动** → 更新阅读进度条
4. **点击链接** → 拦截内部链接
5. **点击代码块** → 复制代码

**事件委托**：
```javascript
// 统一处理侧边栏点击
document.getElementById('sidebar').addEventListener('click', (e) => {
  // 事件委托处理
});
```

### 2.5 错误处理

**三层错误处理**：
1. **API 请求层**：try-catch + 友好提示
2. **渲染层**：为每个渲染器单独 try-catch
3. **库加载层**：检查库是否定义

**错误展示**：
```javascript
const errorDiv = document.createElement('div');
errorDiv.style.color = '#ff6b6b';
errorDiv.textContent = '错误信息';
```

### 2.6 搜索模块 (`js/search.js`)

**功能**：全文搜索所有文档内容

**实现方式**：
- 预构建 `search-index.json`（通过 GitHub Action 自动生成）
- 原生 JavaScript 字符串匹配，支持中英文搜索
- 支持标题、路径、预览内容的加权匹配
- 防抖搜索优化性能

**搜索算法**：
```javascript
function simpleSearch(query) {
  const results = [];
  const queryLower = query.toLowerCase();
  
  documents.forEach((doc, index) => {
    let score = 0;
    if (titleLower.includes(queryLower)) score += 10;  // 标题权重最高
    if (previewLower.includes(queryLower)) score += 5;  // 预览内容
    if (pathLower.includes(queryLower)) score += 2;     // 路径匹配
    
    if (score > 0) results.push({ index, score });
  });
  
  return results.sort((a, b) => b.score - a.score);  // 按分数排序
}
```

**搜索索引结构**：
```json
{
  "path": "docs/guide.md",
  "title": "用户指南",
  "preview": "这是文档的预览内容..."
}
```

### 2.7 路由模块 (`js/router.js`)

**功能**：Hash 路由管理，每个文档有独特 URL

**实现方式**：
- 监听 `hashchange` 事件
- URL 格式：`#/path/to/document.md`
- 自动加载对应文档并更新浏览器地址栏
- 支持分享和书签

**路由处理**：
```javascript
window.addEventListener('hashchange', () => {
  const hash = window.location.hash;
  if (hash.startsWith('#/')) {
    const path = hash.substring(2);
    loadMarkdownFile(path);
  }
});
```

### 2.8 Markdown 模块增强 (`js/markdown.js`)

**新增功能**：
1. **YAML Frontmatter 解析**：
   ```javascript
   function parseFrontmatter(markdown) {
     // 解析 --- 包裹的 YAML 内容
   }
   ```

2. **面包屑导航生成**：
   ```javascript
   function updateBreadcrumbs(path) {
     // 解析路径，生成可点击的面包屑
   }
   ```

3. **悬浮 FAB 编辑按钮**：
   - 右下角圆形按钮
   - 跳转到 GitHub 编辑页面
   - 紫色渐变背景，悬停放大效果

---

## 3. styles.css 样式系统分析

### 3.1 设计系统

#### 3.1.1 CSS 变量（Design Tokens）

```css
:root {
  /* 颜色 */
  --color-bg: #fafafa;
  --color-surface: #ffffff;
  --color-border: #f0f0f0;
  --color-text: #2d2d2d;
  --color-text-muted: #999999;
  --color-accent-purple: #d4a5c9;
  --color-accent-pink: #f2c4ce;
  --color-accent-purple-deep: #b88aad;
  
  /* 字体 */
  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-body: 'IBM Plex Sans', -apple-system, sans-serif;
  
  /* 尺寸 */
  --sidebar-width: 280px;
  
  /* 动画 */
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

#### 3.1.2 色彩系统

**主色调**：浅紫 + 浅粉
- 柔和不刺眼
- 适合长时间阅读
- 高对比度，易于识别

**配色规则**：
- 背景：`#fafafa`（接近白色，减少眼睛疲劳）
- 卡片：`#ffffff`（纯白，突出内容）
- 边框：`#f0f0f0`（极淡，区分层级）

#### 3.1.3 字体系统

| 用途 | 字体 | 特点 |
|------|------|------|
| 标题 | Cormorant Garamond | 衬线体，优雅，适合标题 |
| 正文 | IBM Plex Sans | 无衬线，清晰，适合阅读 |

### 3.2 布局系统

#### 3.2.1 整体布局

```
┌──────────────────────────────────┐
│        进度条 (position: fixed)   │
├─────────┬────────────────────────┤
│         │                        │
│ 侧边栏   │      主内容区          │
│ 280px   │      flex: 1           │
│ fixed   │                        │
│         │                        │
│ 文件树   │      Markdown 渲染     │
│ 或目录   │                        │
│         │                        │
├─────────┴────────────────────────┤
│         阅读进度条 (fixed)        │
└──────────────────────────────────┘
```

#### 3.2.2 响应式断点

```css
/* 平板和手机 */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .main-content {
    margin-left: 0;
  }
  .mobile-menu-btn {
    display: block;
  }
}

/* 桌面端 */
@media (min-width: 769px) {
  .sidebar {
    transform: translateX(0);
  }
  .mobile-menu-btn {
    display: none;
  }
  .sidebar-overlay {
    display: none;
  }
}
```

### 3.3 组件系统

#### 3.3.1 侧边栏组件

```css
.sidebar {
  position: fixed;
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--color-surface);
  transition: var(--transition-smooth);
}

.sidebar.open {
  transform: translateX(0);
}
```

**状态**：
- **默认（桌面）**：始终可见
- **默认（移动）**：隐藏，滑入
- **打开**：translateX(0)
- **关闭**：translateX(-100%)

#### 3.3.2 文件树组件

```css
.folder-item {
  cursor: pointer;
  transition: var(--transition-smooth);
}

.folder-item:hover {
  background: rgba(212, 165, 201, 0.1);
}

.folder-item.expanded .folder-icon {
  transform: rotate(90deg);
}

.file-item {
  cursor: pointer;
}

.file-item.active {
  font-weight: 600;
  background: rgba(212, 165, 201, 0.15);
}
```

**交互细节**：
- 点击文件夹：展开/折叠
- 点击文件：高亮并加载
- 展开动画：icon 旋转 90°

#### 3.3.3 Markdown 内容样式

```css
.markdown-body {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
}

.markdown-body h1,
.markdown-body h2 {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.3em;
}

/* 代码块 */
.markdown-body pre {
  background: #f6f8fa;
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  cursor: pointer;
}

.markdown-body pre:hover {
  background: #f0f0f0;
}
```

### 3.4 特效系统

#### 3.4.1 发光进度条

```css
.progress-bar {
  height: 2px;
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.9),
    rgba(255,255,255,0.7)
  );
  box-shadow: 
    0 0 8px rgba(255,255,255,0.8),
    0 0 16px rgba(255,255,255,0.6),
    0 0 24px rgba(255,255,255,0.4);
}
```

**效果**：白色荧光条，仿佛有光晕

#### 3.4.2 滚动条样式

```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background: var(--color-accent-purple);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-accent-purple-deep);
}
```

### 3.5 图表容器样式

#### 3.5.1 Mermaid 图表

```css
.mermaid-diagram {
  margin: 1.5em 0;
  padding: 1.5em;
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  text-align: center;
  overflow-x: auto;
}
```

#### 3.5.2 ApexCharts

```css
.apex-chart {
  margin: 1.5em 0;
  padding: 1.5em;
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}
```

#### 3.5.3 地理地图

```css
.geo-map {
  margin: 1.5em 0;
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
}
```

#### 3.5.4 乐谱容器

```css
.music-notation {
  margin: 1.5em 0;
  padding: 1.5em;
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  overflow-x: auto;
}
```

---

## 4. 扩展开发指南

### 4.1 添加新的图表渲染器

**步骤 1**：在 `index.html` 添加库依赖

```html
<script src="https://cdn.example.com/chart-lib.min.js"></script>
```

**步骤 2**：实现渲染函数

```javascript
function renderNewCharts() {
  const allPres = document.querySelectorAll('.markdown-body pre');
  
  for (let i = allPres.length - 1; i >= 0; i--) {
    const pre = allPres[i];
    const codeElement = pre.querySelector('code');
    
    if (!codeElement) continue;
    
    const classList = codeElement.className;
    if (!classList || !classList.includes('language-newchart')) continue;
    
    try {
      const chartCode = codeElement.textContent.trim();
      const container = document.createElement('div');
      container.className = 'new-chart';
      
      // 执行渲染逻辑
      renderChartLogic(chartCode, container);
      
      // 替换 DOM
      pre.parentNode.replaceChild(container, pre);
    } catch (error) {
      console.error('Chart rendering error:', error);
    }
  }
}
```

**步骤 3**：在渲染管道中注册

```javascript
setTimeout(() => {
  renderApexCharts();
  renderMusicNotation();
  renderDiff();
  renderMermaidDiagrams();
  renderPlantUMLDiagrams();
  renderNewCharts();  // 添加在这里
  renderEmbeddedServices();
}, 100);
```

**步骤 4**：添加样式

```css
.new-chart {
  margin: 1.5em 0;
  padding: 1.5em;
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}
```

### 4.2 添加新的外部嵌入服务

在 `createEmbedIframe` 函数中添加：

```javascript
function createEmbedIframe(service, url) {
  const iframeBase = '<iframe src="{src}" width="100%" height="{height}" frameborder="0" allowfullscreen></iframe>';
  
  switch (service) {
    // ... 现有服务 ...
    
    case 'newservice':
      const videoId = url.match(/正则/)?.[1] || url;
      return iframeBase
        .replace('{src}', `https://newservice.com/embed/${videoId}`)
        .replace('{height}', '400');
      
    default:
      return null;
  }
}
```

### 4.2.1 Twitter/X 嵌入实现

Twitter 嵌入与 iframe 不同，需要使用官方 widget.js：

```javascript
function renderTwitterEmbed(service, url, originalMatch) {
  try {
    let embedCode = '';
    
    // 推文嵌入
    const tweetMatch = url.match(/twitter\.com\/\w+\/status\/(\d+)/);
    if (tweetMatch) {
      embedCode = `<blockquote class="twitter-tweet"><a href="${url}">...</a></blockquote>`;
    }
    // 时间线嵌入
    else if (url.includes('twitter.com/') && !url.includes('/status/')) {
      embedCode = `<a class="twitter-timeline" href="${url}">...</a>`;
    }
    
    if (embedCode) {
      markdownContent.innerHTML = markdownContent.innerHTML.replace(originalMatch, embedCode);
      
      // 异步加载 Twitter widgets
      if (typeof twttr !== 'undefined' && twttr.widgets) {
        twttr.widgets.load();
      } else {
        // 等待加载
        const checkTwitter = setInterval(() => {
          if (typeof twttr !== 'undefined' && twttr.widgets) {
            twttr.widgets.load();
            clearInterval(checkTwitter);
          }
        }, 100);
      }
    }
  } catch (error) {
    console.error('Twitter embed error:', error);
  }
}
```

**关键技术点**：
- **Widget.js**：`https://platform.twitter.com/widgets.js`
- **异步加载**：使用 `async` 属性不阻塞页面
- **嵌入式 HTML**：使用 `blockquote.twitter-tweet` 和 `a.twitter-timeline`
- **自动初始化**：通过 `twttr.widgets.load()` 触发渲染

### 4.3 自定义配置

修改 `js/config.js` 中的 `CONFIG` 对象：

```javascript
window.MarkdownPreview.CONFIG = {
  owner: 'your-github-username',  // 必填：GitHub 用户名
  repo: 'your-repo-name'          // 必填：仓库名称
};
```

---

## 5. 性能优化建议

### 5.1 渲染优化

1. **延迟加载库**：只加载当前 Markdown 文件需要的库
2. **缓存已渲染内容**：避免重复渲染
3. **使用 Intersection Observer**：懒加载可视化内容

### 5.2 API 优化

1. **添加请求缓存**：避免重复请求
2. **错误重试机制**：网络不稳定时自动重试
3. **请求取消**：切换文件时取消未完成的请求

### 5.3 DOM 优化

1. **批量 DOM 操作**：使用 DocumentFragment
2. **减少重排重绘**：合并样式变更
3. **事件委托**：减少事件监听器数量

---

## 6. 测试建议

### 6.1 手动测试清单

- [ ] GitHub API 连接正常
- [ ] 文件树正确显示
- [ ] Markdown 文件加载和渲染
- [ ] Mermaid 图表渲染
- [ ] PlantUML 图表渲染
- [ ] ApexCharts 图表渲染
- [ ] 乐谱渲染（abc/musicxml/osmd）
- [ ] Diff 可视化
- [ ] 地理数据可视化
- [ ] 外部服务嵌入
- [ ] 移动端响应式布局
- [ ] 侧边栏展开/折叠
- [ ] 代码复制功能
- [ ] 进度条更新
- [ ] 全文搜索功能正常
- [ ] 搜索结果显示和点击跳转
- [ ] Hash 路由正常工作
- [ ] 面包屑导航显示
- [ ] 编辑按钮正常跳转
- [ ] 悬浮 FAB 显示和交互
- [ ] Frontmatter 解析

### 6.2 边界情况测试

- 无网络连接
- GitHub API 速率限制
- 空仓库
- 深层嵌套目录
- 超大 Markdown 文件
- 非标准代码块格式
- 错误的 JSON 配置
- 浏览器兼容性问题

---

## 7. 常见问题排查

### 问题 1：图表不渲染

**排查步骤**：
1. 打开浏览器控制台（F12）
2. 检查是否有库加载错误
3. 检查代码块类型是否正确
4. 检查 JSON 格式是否有效

### 问题 2：文件列表不显示

**排查步骤**：
1. 检查 GitHub API 是否可访问
2. 检查 CONFIG 配置是否正确
3. 检查仓库是否包含 .md 文件
4. 检查 GitHub Pages 是否启用

### 问题 3：移动端样式错乱

**排查步骤**：
1. 检查 CSS 断点设置
2. 检查 flexbox 布局
3. 测试不同设备尺寸

---

## 8. 版本历史与贡献

### 8.1 当前版本功能

| 功能 | 状态 | 代码位置 |
|------|------|---------|
| GitHub API 集成 | ✅ 完成 | js/file-tree.js |
| 文件树构建 | ✅ 完成 | js/file-tree.js |
| Markdown 渲染 | ✅ 完成 | js/markdown.js |
| Mermaid 图表 | ✅ 完成 | js/renderers/mermaid.js |
| PlantUML 图表 | ✅ 完成 | js/renderers/plantuml.js |
| ApexCharts | ✅ 完成 | js/renderers/apexcharts.js |
| 乐谱渲染 | ✅ 完成 | js/renderers/music-notation.js |
| Diff 可视化 | ✅ 完成 | js/renderers/diff.js |
| 地理数据可视化 | ✅ 完成 | js/renderers/geo.js |
| Twitter/X 嵌入 | ✅ 完成 | js/renderers/embedded.js |
| 外部服务嵌入 | ✅ 完成 | js/renderers/embedded.js |
| **全文搜索** | ✅ 完成 | js/search.js |
| **Hash 路由** | ✅ 完成 | js/router.js |
| **面包屑导航** | ✅ 完成 | js/markdown.js |
| **编辑按钮** | ✅ 完成 | js/markdown.js + styles.css |
| **Frontmatter** | ✅ 完成 | js/markdown.js |
| **悬浮 FAB** | ✅ 完成 | styles.css + index.html |

### 8.2 贡献指南

欢迎提交 Issue 和 Pull Request！

**提交流程**：
1. Fork 仓库
2. 创建功能分支
3. 编写代码和测试
4. 提交 Pull Request
5. 等待代码审查

---

## 9. 技术参考

### 9.1 外部库文档

- [Marked.js](https://marked.js.org/)
- [Mermaid.js](https://mermaid.js.org/)
- [PlantUML](https://plantuml.com/)
- [ApexCharts](https://apexcharts.com/)
- [Leaflet.js](https://leafletjs.com/)
- [abcjs](https://abcjs.net/)
- [Verovio](https://www.verovio.org/)
- [OSMD](https://opensheetmusicdisplay.org/)
- [diff2html](https://diff2html.xyz/)
- [Twitter 嵌入文档](https://developer.twitter.com/en/docs/twitter-for-websites/embedded-tweets/overview)
- [Twitter Widgets.js](https://platform.twitter.com/widgets.js)

### 9.2 学习资源

- [GitHub REST API](https://docs.github.com/en/rest)
- [CSS 变量指南](https://developer.mozilla.org/zh-CN/docs/Web/CSS/Using_CSS_custom_properties)
- [JavaScript 事件委托](https://developer.mozilla.org/zh-CN/docs/Learn/JavaScript/Building_blocks/Event_bubbling)

---

**最后更新**：2026-05-21
**文档版本**：1.1.0
