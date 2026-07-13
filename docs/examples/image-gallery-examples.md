# 图片画廊与懒加载示例

本页面展示图片的懒加载、画廊模式（含多种布局样式）、图片灯箱和错误降级功能。

---

## 1. 图片懒加载

所有图片都自动添加了 `loading="lazy"` 属性，会在图片进入视口时才加载。

**语法格式：**

```markdown
![图片描述](图片URL)
```

图片会在滚动到视口时才开始加载，提升页面性能。

---

## 2. 画廊模式

当文档中出现连续两张或以上的图片（中间无其他内容）时，会自动包装成画廊布局。

### 两张图片画廊

以下两张图片会自动布局成画廊：

![图片1](https://picsum.photos/400/300?random=1)
![图片2](https://picsum.photos/400/300?random=2)

### 四张图片画廊

连续四张图片也会自动组成画廊：

![图片3](https://picsum.photos/400/300?random=3)
![图片4](https://picsum.photos/400/300?random=4)
![图片5](https://picsum.photos/400/300?random=5)
![图片6](https://picsum.photos/400/300?random=6)

### 单张图片

如果只有一张图片，则不会触发画廊模式，保持原样：

![单张图片](https://picsum.photos/600/400?random=7)

---

## 3. 画廊布局样式

除了默认的网格布局，还可以通过 `@style` 标记指定更自由的画廊渲染样式。

### 语法

在连续图片之前，用单独一行 `@样式名` 指定该组图片的渲染样式：

```markdown
@cardstack

![图1](url1)
![图2](url2)
![图3](url3)
```

- `@style` 必须独占一行（单独成段）
- 标记只作用于紧跟其后的一组连续图片
- 不写 `@style` 时，连续 2 张及以上图片自动使用默认网格布局
- 未识别的 `@xxx` 会被当作普通文本输出

### 支持的样式一览

| 样式 | 说明 |
|------|------|
| `@grid` | 默认网格，自适应列数（与不写标记相同） |
| `@cardstack` | 扑克牌堆：中间主图，左右错层露一角，边缘模糊 |
| `@filmstrip` | 胶片条：横向滚动，上下带胶片穿孔装饰 |
| `@polaroid` | 拍立得墙：白边相框，轻微旋转错落排布 |
| `@stack` | 堆叠覆盖：图片相互覆盖，hover 时展开扇形 |
| `@mosaic` | 马赛克：首张大图占两格，其余小图网格排布 |
| `@carousel` | 3D 旋转木马：图片围成弧形，中间正中两侧 3D 倾斜后退 |
| `@scattered` | 散落明信片：图片随机散落在画布上，hover 置顶拉直放大 |
| `@hexagon` | 蜂巢六边形：图片裁切为六边形，错位蜂巢排列 |
| `@coverflow` | Cover Flow：中间正中放大，两侧 3D 倾斜后退，hover 整体滑动 |
| `@tape` | 胶带粘贴：每张图用半透明胶带斜贴在木板上，hover 胶带绷直 |

### 3.1 `@grid` — 默认网格

显式声明网格布局，与不写标记效果相同。

@grid

![grid-1](https://picsum.photos/400/300?grid1)
![grid-2](https://picsum.photos/400/300?grid2)
![grid-3](https://picsum.photos/400/300?grid3)
![grid-4](https://picsum.photos/400/300?grid4)

### 3.2 `@cardstack` — 扑克牌堆

中间一张主图正中显示，左右各错层露出一张图的一角（5 度斜边），边缘模糊。hover 时整体轻微抬起。

@cardstack

![card-1](https://picsum.photos/400/500?card1)
![card-2](https://picsum.photos/400/500?card2)
![card-3](https://picsum.photos/400/500?card3)

> 建议：cardstack 最适合 3 张图，第 4 张及之后会被隐藏。

### 3.3 `@filmstrip` — 胶片条

模拟老式胶卷的横向滚动条，上下带白色穿孔装饰，图片横向排列可滚动浏览。

@filmstrip

![film-1](https://picsum.photos/400/300?film1)
![film-2](https://picsum.photos/400/300?film2)
![film-3](https://picsum.photos/400/300?film3)
![film-4](https://picsum.photos/400/300?film4)
![film-5](https://picsum.photos/400/300?film5)

### 3.4 `@polaroid` — 拍立得墙

白色相框 + 底部留白，每张图片轻微旋转，像随手贴在墙上的拍立得照片。hover 时拉直放大。

@polaroid

![polaroid-1](https://picsum.photos/300/300?pol1)
![polaroid-2](https://picsum.photos/300/300?pol2)
![polaroid-3](https://picsum.photos/300/300?pol3)
![polaroid-4](https://picsum.photos/300/300?pol4)

### 3.5 `@stack` — 堆叠覆盖

多张图片相互覆盖堆叠，仅露出最顶层的完整图。hover 整个画廊时，图片会展开为扇形。

@stack

![stack-1](https://picsum.photos/400/300?stk1)
![stack-2](https://picsum.photos/400/300?stk2)
![stack-3](https://picsum.photos/400/300?stk3)
![stack-4](https://picsum.photos/400/300?stk4)

### 3.6 `@mosaic` — 马赛克

首张图占据左侧大格（跨两行），其余小图填在右侧网格中。适合「主图 + 配图」的展示场景。

@mosaic

![mosaic-main](https://picsum.photos/600/400?mosmain)
![mosaic-2](https://picsum.photos/300/200?mos2)
![mosaic-3](https://picsum.photos/300/200?mos3)
![mosaic-4](https://picsum.photos/300/200?mos4)
![mosaic-5](https://picsum.photos/300/200?mos5)

### 3.7 `@carousel` — 3D 旋转木马

图片围成弧形排列，中间一张正中放大，两侧 3D 倾斜后退并降低亮度。hover 时侧边图轻微前推。

@carousel

![carousel-1](https://picsum.photos/400/500?car1)
![carousel-2](https://picsum.photos/400/500?car2)
![carousel-3](https://picsum.photos/400/500?car3)
![carousel-4](https://picsum.photos/400/500?car4)
![carousel-5](https://picsum.photos/400/500?car5)

> 建议：carousel 最适合 5 张图，第 6 张及之后会被隐藏。

### 3.8 `@scattered` — 散落明信片

图片随机散落在画布上，每张不同角度倾斜。hover 时置顶、拉直、放大上浮。

@scattered

![scatter-1](https://picsum.photos/400/300?sct1)
![scatter-2](https://picsum.photos/400/300?sct2)
![scatter-3](https://picsum.photos/400/300?sct3)
![scatter-4](https://picsum.photos/400/300?sct4)
![scatter-5](https://picsum.photos/400/300?sct5)
![scatter-6](https://picsum.photos/400/300?sct6)

> 建议：scattered 最适合 6 张以内的图，第 7 张及之后会自动流到下方网格。

### 3.9 `@hexagon` — 蜂巢六边形

图片裁切为六边形，偶数列下移半格形成蜂巢排列。hover 时放大并提亮饱和度。

@hexagon

![hex-1](https://picsum.photos/300/400?hex1)
![hex-2](https://picsum.photos/300/400?hex2)
![hex-3](https://picsum.photos/300/400?hex3)
![hex-4](https://picsum.photos/300/400?hex4)
![hex-5](https://picsum.photos/300/400?hex5)
![hex-6](https://picsum.photos/300/400?hex6)

### 3.10 `@coverflow` — Cover Flow

中间一张正中放大，两侧 3D 倾斜后退并模糊。hover 整个画廊时向左滑动一张，露出右侧更多图。

@coverflow

![cov-1](https://picsum.photos/400/500?cov1)
![cov-2](https://picsum.photos/400/500?cov2)
![cov-3](https://picsum.photos/400/500?cov3)
![cov-4](https://picsum.photos/400/500?cov4)
![cov-5](https://picsum.photos/400/500?cov5)

> 建议：coverflow 最适合 5 张图，第 6 张及之后会被隐藏。

### 3.11 `@tape` — 胶带粘贴

每张图片像用半透明黄色胶带斜贴在木板上（带木纹背景），每张角度不同。hover 时胶带绷直、图片拉直放大。

@tape

![tape-1](https://picsum.photos/400/300?tap1)
![tape-2](https://picsum.photos/400/300?tap2)
![tape-3](https://picsum.photos/400/300?tap3)
![tape-4](https://picsum.photos/400/300?tap4)

### 自定义样式

所有画廊样式定义在 [iris/css/galleries.css](../../iris/css/galleries.css) 中。如需新增样式：

1. 在 `galleries.css` 中添加 `.image-gallery--{新样式名}` 选择器
2. 在 [iris/js/markdown.js](../../iris/js/markdown.js) 的 `knownStyles` 数组里加入新样式名

---

## 4. 图片灯箱

点击任意图片可打开全屏灯箱，支持：

- 滚轮缩放
- 左右键翻页（自动收集当前文档所有图片）
- Esc 关闭

点击上面的任意图片试试看。

---

## 5. 图片错误降级

当图片加载失败时，会显示一个友好的占位符，而不是破碎的图片图标。

占位符会显示：
- 🖼️ 图标
- 图片的 alt 文本（如果有）
- 文件名（从 URL 中提取）

### 示例

以下是一个故意使用错误 URL 的图片，会触发错误降级：

![示例图片](https://example.com/non-existent-image.jpg)

---

## 6. 语法说明

### 基本图片语法

```markdown
![alt文本](图片URL)
```

### 带标题的图片

```markdown
![图片描述](图片URL "图片标题")
```

### 使用占位图服务

可以使用 picsum.photos 等占位图服务：

```markdown
![风景](https://picsum.photos/800/600)
```

### 使用本地图片

```markdown
![截图](../images/screenshot.png)
```

---

## 7. 常见问题

### Q: 为什么我的图片没有进入画廊？

**A:** 确保图片之间没有其他内容（如文字、标题等）。画廊只会识别连续的纯图片段落。

### Q: `@style` 标记不生效？

**A:** 检查以下几点：
- `@style` 必须独占一行（前后空行分隔）
- 样式名必须是小写字母，支持连字符（如 `@cardstack`、`@filmstrip`）
- 样式名必须在已注册列表中（见上方表格）
- 标记与图片之间不能有其他内容

### Q: 图片加载失败怎么办？

**A:** 系统会自动显示占位符，显示文件名和 alt 文本，而不是破碎的图片。

### Q: 如何禁用懒加载？

**A:** 目前懒加载是默认启用的，无法禁用。这是为了提升页面性能。

---

## 8. 技术细节

### 使用的技术

- **原生 lazy loading**：使用 HTML5 `loading="lazy"` 属性
- **CSS Grid / Flex / 绝对定位**：多种画廊布局
- **clip-path + mask-image**：cardstack 的斜边裁切与边缘模糊
- **DOM 操作**：自动识别连续图片并分组，消费 `@style` 标记
- **错误处理**：onerror 事件实现降级

### 浏览器支持

- Chrome 76+
- Firefox 75+
- Safari (partial)
- Edge 79+

现代浏览器都支持原生懒加载。cardstack 的 mask-image 在旧版 Safari 上可能降级为无模糊。

---

**最后更新**：2026-07-13
