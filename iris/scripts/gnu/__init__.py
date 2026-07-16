"""Graphviz DOT 网络拓扑解析器模块

将 Graphviz DOT 格式的网络拓扑文件解析为结构化 JSON，
保持与 pkt 模块相同的数据结构，便于前端统一渲染。

子模块：
- parse: DOT 文件解析核心逻辑
- output: JSON 输出构建
- main: 命令行主入口
"""

__version__ = '1.0.0'
