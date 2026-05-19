# Markdown 预览器

这是一个极简风格的 Markdown 文件预览工具，专为 GitHub Pages 设计，完全静态，无需后端。

## 功能特点

- 📂 **自动发现** - 通过 GitHub API 自动扫描仓库中的所有 .md 文件
- 🌳 **树形文件结构** - 自动构建文档目录树
- 📱 **完美适配移动端** - 响应式设计，支持各种设备
- 🎨 **优雅设计** - 浅紫浅粉色系，极简风格
- ✨ **流畅动画** - 丝滑的加载和导航效果
- 🔒 **纯前端** - 无需后端或构建工具

## 快速开始

### 在 GitHub Pages 上使用：

1. 将以下文件复制到你的 GitHub 仓库根目录：
   - `index.html`
   - `styles.css`
   - `app.js`

2. 编辑 `app.js` 中的 `CONFIG` 配置你的仓库信息：
   ```javascript
   const CONFIG = {
     owner: '你的用户名',
     repo: '你的仓库名'
   };
   ```

3. 在仓库设置中启用 GitHub Pages，选择 `main` 分支或其他分支

4. 访问 `https://你的用户名.github.io/仓库名/`

### 添加新文档

只需在仓库的任何位置添加 `.md` 文件，系统会自动发现并显示在侧边栏！

## 配置说明

在 `app.js` 中配置：

```javascript
const CONFIG = {
  owner: 'theforeveriris',  // 你的 GitHub 用户名
  repo: 'md-preview'        // 你的仓库名称
};
```

## 文件结构

你的仓库可以有任意的文件结构，所有 .md 文件都会被自动发现：

```
你的仓库/
├── index.html       # 主页面（必须在根目录）
├── styles.css       # 样式文件（必须在根目录）
├── app.js          # 功能逻辑和配置（必须在根目录）
├── README.md        # 你的文档
├── docs/           # 任意结构的文档目录
│   ├── guide.md
│   └── ...
└── any/            # 任意位置的文档
    └── file.md
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
| 自动发现 | 通过 GitHub API 扫描所有 .md 文件 |
| 实时预览 | Markdown 即时渲染 |
| 响应式布局 | 支持各种屏幕尺寸 |
