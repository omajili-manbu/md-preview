# Packet Tracer .pkt → JSON 预处理脚本

将 Cisco Packet Tracer 的 `.pkt` 文件解析为结构化 JSON，供前端 Cytoscape.js 渲染为交互式拓扑图。

## 快速开始

```bash
# 1. 将 .pkt 文件放入 raw 目录
cp your-topology.pkt iris/data/pkt/raw/

# 2. 运行脚本（增量处理）
python iris/scripts/pkt/main.py --verbose

# 3. 强制全量重建
python iris/scripts/pkt/main.py --force
```

## 目录结构

```
iris/data/pkt/
├── raw/      # 原始 .pkt 文件（用户放入）
├── xml/      # 解密解压后的 XML（中间产物）
└── json/     # 解析后的 JSON（前端读取）
```

## 模块说明

| 文件 | 功能 |
|------|------|
| `decrypt.py` | 解密：旧版 XOR + 新版 Twofish EAX（纯 Python 实现） |
| `decompress.py` | 解压：zlib（支持多种格式自适应） |
| `parse.py` | XML 解析：设备/链路/配置/接口/VLAN/ACL/路由推算 |
| `output.py` | JSON 输出：顶层分区式 schema + 错误 JSON |
| `main.py` | 主流程：mtime 增量 + 单文件处理 + 汇总报告 |

## 支持的 PT 版本

- PT 5.x / 6.x / 7.0-7.2：XOR 加密（文件大小递减密钥）
- PT 7.3+ / 8.x：Twofish EAX 加密（社区逆向密钥）

## 依赖

零第三方依赖，仅使用 Python 标准库：

- `struct` / `zlib` / `xml.etree.ElementTree` / `re` / `json` / `pathlib`

## CI 自动构建

GitHub Actions 工作流 `.github/workflows/build-pkt.yml` 会在以下情况自动运行：

- 推送 `.pkt` 文件到 `iris/data/pkt/raw/`
- 修改 `iris/scripts/pkt/` 下的脚本
- 手动触发

构建后会自动提交生成的 JSON/XML 到仓库。

## JSON Schema

```json
{
  "meta": { "source", "ptVersion", "deviceCount", "linkCount", ... },
  "devices": [{ "id", "name", "type", "x", "y", "primaryIp", ... }],
  "links": [{ "source", "target", "cableType", "bandwidth", ... }],
  "configs": [{ "deviceId", "config" }],
  "interfaces": { "deviceId": [{ "name", "ip", "mask", "status", ... }] },
  "vlans": { "deviceId": [{ "id", "name" }] },
  "acls": { "deviceId": [{ "name", "type", "rules" }] },
  "routes": { "deviceId": [{ "type", "network", "mask", "nextHop" }] },
  "groups": [{ "name", "members" }],
  "error": null | { "code", "message", "detail" }
}
```

## 前端引用

在 Markdown 中使用嵌入语法：

```
@[pkt](example)
```

会自动加载 `iris/data/pkt/json/example.json` 并渲染为交互式拓扑图。
