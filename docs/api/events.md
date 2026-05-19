# 事件系统

## 页面加载事件

### `DOMContentLoaded`

当 DOM 完全加载后触发。

```javascript
document.addEventListener('DOMContentLoaded', () => {
  console.log('页面已加载完成');
});
```

## 文件操作事件

### 文件点击事件

点击文件时自动触发文件加载。

**实现方式**：在 `renderFileTree` 函数中绑定

```javascript
fileEl.addEventListener('click', (e) => {
  e.preventDefault();
  loadMarkdownFile(item.path);
  setActiveFile(fileEl);
  closeSidebarOnMobile();
});
```

## 侧边栏事件（移动端）

### 切换侧边栏

```javascript
mobileMenuBtn.addEventListener('click', toggleSidebar);
```

### 关闭侧边栏

```javascript
sidebarOverlay.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSidebar();
  }
});
```

## 滚动事件

### 阅读进度跟踪

```javascript
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  readingProgressBar.style.width = scrollPercent + '%';
});
```

### 文件加载进度

在 `loadMarkdownFile` 函数中实现：

```javascript
async function loadMarkdownFile(path) {
  try {
    updateProgress(30);
    const response = await fetch(path);
    updateProgress(60);
    const markdown = await response.text();
    updateProgress(100);
    renderMarkdown(markdown);
  } catch (error) {
    console.error('Error loading markdown:', error);
  }
}
```

## 代码块交互

### 点击复制

```javascript
document.querySelectorAll('.markdown-body pre').forEach(pre => {
  pre.addEventListener('click', () => {
    copyCodeToClipboard(pre);
  });
});
```

## 自定义事件

你可以通过以下方式添加自定义事件：

```javascript
document.dispatchEvent(new CustomEvent('fileLoaded', {
  detail: { path: 'docs/guide.md' }
}));
```

监听自定义事件：

```javascript
document.addEventListener('fileLoaded', (e) => {
  console.log('文件已加载:', e.detail.path);
});
```
