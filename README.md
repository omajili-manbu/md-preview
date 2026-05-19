# Markdown 预览器

这是一个极简风格的 Markdown 文件预览工具，专为 GitHub Pages 设计，完全静态，无需后端。

## 功能特点

- 📂 树形文件结构展示
- 📱 完美适配移动端
- 🎨 优雅的浅紫浅粉色系设计
- ✨ 流畅的动画效果
- 🔒 纯前端，无需后端支持

## 快速开始

### 在 GitHub Pages 上使用：

1. 将以下文件复制到你的 GitHub 仓库根目录：
   - `index.html`
   - `styles.css`
   - `app.js`

2. 编辑 `app.js` 中的 `CONFIG.files` 配置，添加你的 Markdown 文件列表

3. 在仓库设置中启用 GitHub Pages，选择 `main` 分支或其他分支

4. 访问 `https://你的用户名.github.io/仓库名/`

### 配置文件列表

在 `app.js` 中编辑 `CONFIG.files`：

```javascript
const CONFIG = {
  files: [
    {
      name: 'README.md',
      type: 'file',
      path: 'README.md'
    },
    {
      name: 'docs',
      type: 'folder',
      children: [
        {
          name: 'guide.md',
          type: 'file',
          path: 'docs/guide.md'
        }
      ]
    }
  ]
};
```

## 文件结构说明

```
你的仓库/
├── index.html       # 主页面（必须在根目录）
├── styles.css       # 样式文件（必须在根目录）
├── app.js          # 功能逻辑和配置（必须在根目录）
├── README.md        # 你的文档
└── docs/
    └── guide.md     # 其他文档
```

## 代码示例

```javascript
const greeting = "Hello, World!";
console.log(greeting);
```

## 引用示例

> 这是一个引用示例
> 可以用来展示重要的文字内容

## 列表

- 第一项
- 第二项
- 第三项

## 表格

| 功能 | 描述 |
|------|------|
| 文件浏览 | 树形结构导航 |
| 实时预览 | Markdown 即时渲染 |
| 响应式布局 | 支持各种屏幕尺寸 |
