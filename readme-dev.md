# Markdown Preview - 开发者文档

本文档面向希望深入了解或扩展本项目的开发者。

---

## 1. 项目架构总览

### 1.1 技术栈

| 技术 | 用途 |
|------|------|
| **HTML5** | 页面结构，语义化标签 |
| **CSS3** | 样式系统，响应式设计，CSS 变量 |
| **Vanilla JavaScript** | 核心功能，无框架依赖 |
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
├── app.js             # 核心业务逻辑，所有功能实现
├── styles.css         # 完整样式系统
├── README.md          # 用户文档
└── readme-dev.md     # 本文档（开发者文档）
```

### 1.3 架构特点

- **纯前端架构**：无需后端，所有逻辑在浏览器运行
- **模块化设计**：使用 IIFE 模式避免全局污染
- **事件驱动**：通过事件委托处理用户交互
- **异步渲染**：Markdown 解析和内容渲染分离

---

## 2. app.js 核心代码分析

### 2.1 代码结构

```javascript
(function() {
  // 1. DOM 元素缓存
  const elements = {};
  
  // 2. 全局配置
  const CONFIG = {};
  
  // 3. 应用状态
  let state = {};
  
  // 4. 初始化函数
  function init() {}
  
  // 5. 文件系统功能
  function loadFileTree() {}
  function buildTreeFromFlatList() {}
  function renderFileTree() {}
  
  // 6. Markdown 渲染功能
  function loadMarkdownFile() {}
  function renderMarkdown() {}
  
  // 7. 扩展功能渲染器
  function renderMermaidDiagrams() {}
  function renderPlantUMLDiagrams() {}
  function renderApexCharts() {}
  function renderMusicNotation() {}
  function renderDiff() {}
  function renderGeoData() {}
  function renderEmbeddedServices() {}
  
  // 8. UI 辅助功能
  function setActiveFile() {}
  function switchMode() {}
  function copyCodeToClipboard() {}
  function updateProgress() {}
  function setupScrollProgress() {}
  
  // 9. 启动应用
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

### 2.2 核心模块详解

#### 2.2.1 GitHub API 集成 (`loadFileTree`)

**功能**：通过 GitHub API 获取仓库文件树

```javascript
async function loadFileTree() {
  const apiUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees/main?recursive=1`;
  const response = await fetch(apiUrl);
  const data = await response.json();
  fileTreeData = buildTreeFromFlatList(data.tree);
  renderFileTree(fileTreeData);
}
```

**特点**：
- 使用 `recursive=1` 获取完整树结构
- 自动过滤 `.md` 文件
- 递归构建目录结构

#### 2.2.2 目录树构建算法 (`buildTreeFromFlatList`)

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

#### 2.2.3 Markdown 渲染管道 (`renderMarkdown`)

**渲染顺序**（至关重要）：

```javascript
setTimeout(() => {
  renderApexCharts();        // 1. 交互式图表
  renderMusicNotation();     // 2. 乐谱
  renderDiff();             // 3. Diff 可视化
  renderMermaidDiagrams();   // 4. Mermaid 图表
  renderPlantUMLDiagrams();  // 5. PlantUML 图表
  renderEmbeddedServices();  // 6. 外部服务嵌入
}, 100);
```

**为什么用 setTimeout(100ms)**：
1. 等待 Marked.js 完成 HTML 转换
2. 确保 DOM 完全渲染
3. 避免异步渲染竞态条件

#### 2.2.4 代码块渲染策略

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

#### 2.2.5 PlantUML 编码 (`encodePlantUML`)

```javascript
function encode64(data) {
  // 1. 将 UTF-8 字节数组压缩
  const compressed = pako.deflateRaw(utf8);
  // 2. 转换为 PlantUML 特殊 Base64
  return encode64(compressed);
}
```

**最终 URL**：`https://www.plantuml.com/plantuml/svg/${encoded}`

#### 2.2.6 ApexCharts 配置 (`renderApexCharts`)

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

#### 2.2.7 外部服务嵌入 (`renderEmbeddedServices`)

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

#### 2.2.8 地理数据渲染 (`renderGeoData`)

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

#### 2.2.9 乐谱渲染 (`renderMusicNotation`)

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

```javascript
let fileTreeData = [];       // 文件树数据
let currentMode = 'files';    // 当前模式：files/index
let currentFilePath = '';     // 当前文件路径
let currentHeadings = [];    // 当前文件的标题列表
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

修改 `CONFIG` 对象：

```javascript
const CONFIG = {
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
| GitHub API 集成 | ✅ 完成 | app.js:30-46 |
| 文件树构建 | ✅ 完成 | app.js:48-100 |
| Markdown 渲染 | ✅ 完成 | app.js:176-205 |
| Mermaid 图表 | ✅ 完成 | app.js:207-243 |
| PlantUML 图表 | ✅ 完成 | app.js:470-504 |
| ApexCharts | ✅ 完成 | app.js:506-572 |
| 乐谱渲染 | ✅ 完成 | app.js:574-773 |
| Diff 可视化 | ✅ 完成 | app.js:775-852 |
| 地理数据可视化 | ✅ 完成 | app.js:870-1000 |
| Twitter/X 嵌入 | ✅ 完成 | app.js:866-910 |
| 外部服务嵌入 | ✅ 完成 | app.js:854-925 |

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

**最后更新**：2026-05-20
**文档版本**：1.0.0
