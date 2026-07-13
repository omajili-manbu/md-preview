# 画廊布局样式

本页演示 Markdown Preview 提供的多种画廊布局。

## 语法

在连续的图片之前，用单独一行 `@样式名` 指定该组图片的渲染样式：

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

## 支持的样式

| 样式 | 说明 |
|------|------|
| `@grid` | 默认网格，自适应列数（与不写标记相同） |
| `@cardstack` | 扑克牌堆：中间一张主图，左右错层露出上下张的一角，边缘模糊 |
| `@filmstrip` | 胶片条：横向滚动，上下带胶片穿孔装饰 |
| `@polaroid` | 拍立得墙：白边相框，轻微旋转错落排布 |
| `@stack` | 堆叠覆盖：图片相互覆盖，hover 时展开为扇形 |
| `@mosaic` | 马赛克：首张大图占两格，其余小图网格排布 |

---

## 1. `@grid` — 默认网格

显式声明网格布局，与不写标记效果相同。

@grid

![grid-1](https://picsum.photos/400/300?grid1)
![grid-2](https://picsum.photos/400/300?grid2)
![grid-3](https://picsum.photos/400/300?grid3)
![grid-4](https://picsum.photos/400/300?grid4)

---

## 2. `@cardstack` — 扑克牌堆

中间一张主图正中显示，左右各错层露出一张图的一角（5 度斜边），边缘模糊。hover 时整体轻微抬起。

@cardstack

![card-1](https://picsum.photos/400/500?card1)
![card-2](https://picsum.photos/400/500?card2)
![card-3](https://picsum.photos/400/500?card3)

> 建议：cardstack 最适合 3 张图，第 4 张及之后会被隐藏。

---

## 3. `@filmstrip` — 胶片条

模拟老式胶卷的横向滚动条，上下带白色穿孔装饰，图片横向排列可滚动浏览。

@filmstrip

![film-1](https://picsum.photos/400/300?film1)
![film-2](https://picsum.photos/400/300?film2)
![film-3](https://picsum.photos/400/300?film3)
![film-4](https://picsum.photos/400/300?film4)
![film-5](https://picsum.photos/400/300?film5)

---

## 4. `@polaroid` — 拍立得墙

白色相框 + 底部留白，每张图片轻微旋转，像随手贴在墙上的拍立得照片。hover 时拉直放大。

@polaroid

![polaroid-1](https://picsum.photos/300/300?pol1)
![polaroid-2](https://picsum.photos/300/300?pol2)
![polaroid-3](https://picsum.photos/300/300?pol3)
![polaroid-4](https://picsum.photos/300/300?pol4)

---

## 5. `@stack` — 堆叠覆盖

多张图片相互覆盖堆叠，仅露出最顶层的完整图。hover 整个画廊时，图片会展开为扇形。

@stack

![stack-1](https://picsum.photos/400/300?stk1)
![stack-2](https://picsum.photos/400/300?stk2)
![stack-3](https://picsum.photos/400/300?stk3)
![stack-4](https://picsum.photos/400/300?stk4)

---

## 6. `@mosaic` — 马赛克

首张图占据左侧大格（跨两行），其余小图填在右侧网格中。适合「主图 + 配图」的展示场景。

@mosaic

![mosaic-main](https://picsum.photos/600/400?mosmain)
![mosaic-2](https://picsum.photos/300/200?mos2)
![mosaic-3](https://picsum.photos/300/200?mos3)
![mosaic-4](https://picsum.photos/300/200?mos4)
![mosaic-5](https://picsum.photos/300/200?mos5)

---

## 样式自定义

所有画廊样式定义在 [iris/css/galleries.css](../../iris/css/galleries.css) 中。如需修改现有样式或新增样式：

1. 在 `galleries.css` 中添加 `.image-gallery--{新样式名}` 选择器
2. 在 [iris/js/markdown.js](../../iris/js/markdown.js) 的 `renderer.paragraph` 中的 `knownStyles` 数组里加入新样式名

样式采用 BEM 风格的修饰类命名：基础类 `.image-gallery` + 修饰类 `.image-gallery--{style}`。
