# 部署指南

将你的 Markdown 预览器部署到 GitHub Pages。

## 前置条件

确保你已经正确配置了 `app.js` 中的仓库信息：

```javascript
const CONFIG = {
  owner: '你的用户名',
  repo: '你的仓库名'
};
```

## 方法一：GitHub Pages（推荐）

### 步骤

1. 登录 GitHub
2. 进入仓库 **Settings**
3. 找到 **Pages** 部分
4. 在 **Source** 下，选择 `main` 分支和 `/ (root)`
5. 点击 **Save**
6. 等待 1-2 分钟部署完成

### 访问地址

```
https://你的用户名.github.io/仓库名/
```

## 方法二：自定义域名

1. 在仓库根目录添加 `CNAME` 文件
2. 在 DNS 设置中添加 CNAME 记录
3. 在 GitHub Pages 设置中启用自定义域名

### CNAME 示例

```
docs.yourdomain.com
```

## 方法三：GitHub Actions 自动部署

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## 验证部署

部署完成后，在浏览器中访问你的站点，确认所有文件都能正常加载和预览。
