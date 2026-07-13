---
title: Packet Tracer 拓扑渲染示例
---

# Packet Tracer 拓扑渲染

本站点支持在 Markdown 文档中嵌入 Cisco Packet Tracer 拓扑图。将 `.pkt` 文件放入 `iris/data/pkt/raw/` 目录，构建脚本会自动解密、解压、解析并生成 JSON，前端用 Cytoscape.js 渲染为交互式拓扑图。

## 基本用法

使用 `@[pkt](文件名)` 嵌入语法引用预处理好的拓扑 JSON：

```
@[pkt](example)
```

渲染效果如下：

@[pkt](example)

## 交互功能

- **缩放平移**：鼠标滚轮缩放，拖拽平移画布
- **节点拖拽**：拖动设备节点重新排列
- **hover 高亮**：鼠标悬停连线显示接口和线缆信息
- **点击详情**：点击设备节点弹出右侧抽屉，查看接口表/配置/VLAN/ACL/路由
- **搜索过滤**：在搜索框输入设备名/IP/类型，匹配设备高亮
- **布局切换**：PT 原始坐标 ↔ 力导向自动布局
- **网格背景**：可切换点阵网格/透明背景
- **导出**：支持导出 PNG 图片 / JSON 数据 / Markdown 表格

## 线缆类型颜色编码

| 颜色 | 线缆类型 |
|------|----------|
| 蓝色 | 直连线 (Straight) |
| 红色 | 交叉线 (Crossover) |
| 紫色 | 光纤 (Fiber) |
| 橙色 | 串口线 (Serial) |
| 绿色 | 控制台线 (Console) |
| 青色 | 无线 (Wireless) |

## 设备类型图标

支持 13 种设备类型的图标渲染：路由器、交换机、PC、服务器、笔记本、防火墙、IP 电话、无线接入点、云、集线器、电视、平板、未知设备。

## 工作流程

1. 将 `.pkt` 文件放入 `iris/data/pkt/raw/`
2. 本地运行 `python iris/scripts/pkt/main.py` 或推送到 GitHub 触发 CI
3. 脚本自动解密（XOR / Twofish EAX）→ 解压（zlib）→ 解析 XML → 输出 JSON
4. 在 Markdown 中用 `@[pkt](文件名)` 引用

## 支持的 PT 版本

- PT 5.x / 6.x / 7.0-7.2（XOR 加密）
- PT 7.3+ / 8.x（Twofish EAX 加密）

## 解析的信息

每个设备可查看以下信息：

- **接口表**：接口名、IP、掩码、状态、双工、速率、描述
- **配置**：完整 startup-config，按 interface 分块折叠，IOS 语法高亮
- **VLAN**：VLAN ID 和名称
- **ACL**：访问控制列表规则
- **路由表**：直连路由、静态路由、OSPF 路由（从配置推算）
