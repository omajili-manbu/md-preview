# API 参考文档

## 配置对象 (CONFIG)

主配置文件，包含仓库信息。

### 属性

#### `owner` (String)

GitHub 用户名或组织名。

#### `repo` (String)

仓库名称。

### 示例配置

```javascript
const CONFIG = {
  owner: 'theforeveriris',
  repo: 'md-preview'
};
```

## 自动发现原理

本工具通过 GitHub API 获取仓库的 Git 树结构：

1. 请求：`GET /repos/{owner}/{repo}/git/trees/main?recursive=1`
2. 解析返回的树结构，筛选所有 .md 文件
3. 自动构建文件夹层级
4. 渲染到侧边栏

## 路径规则

- 所有路径相对于仓库根目录
- 使用正斜杠 `/` 分隔路径

## 注意事项

1. **分支名**：默认使用 `main` 分支，如果使用其他分支需要在代码中修改
2. **GitHub API 限制**：GitHub API 有速率限制，但对于文档预览来说足够用了
3. **文件扩展名**：只识别 `.md` 扩展名的文件
