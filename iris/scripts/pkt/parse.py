"""Packet Tracer XML 解析模块

解析解压后的 XML，提取：
- 设备列表（类型/名称/坐标/型号）
- 链路列表（设备间连接/接口/线缆类型）
- 设备配置（startup-config 纯文本）
- 接口表（IP/掩码/状态/速率/双工/连接对端）
- VLAN 信息
- ACL 规则
- 路由表（从配置推算：静态路由 + 直连路由）

PT 的 XML schema 没有官方文档，结构随版本变化。
本模块兼容 PT 5.x / 6.x / 7.x / 8.x 的主要节点命名。
"""

import re
import xml.etree.ElementTree as ET
from typing import Any


# ============== 设备类型识别 ==============

# PT 中设备类型的识别映射（不区分大小写）
DEVICE_TYPE_MAP = {
    'router': 'router',
    'Router-PT': 'router',
    '2811': 'router',
    '2901': 'router',
    '2911': 'router',
    '1841': 'router',
    '829': 'router',
    '819': 'router',
    'switch': 'switch',
    'Switch-PT': 'switch',
    '2960': 'switch',
    '2950': 'switch',
    '3560': 'switch',
    '3650': 'switch',
    'pc': 'pc',
    'PC-PT': 'pc',
    'PC': 'pc',
    'server': 'server',
    'Server-PT': 'server',
    'Server': 'server',
    'laptop': 'laptop',
    'Laptop-PT': 'laptop',
    'firewall': 'firewall',
    'ASA': 'firewall',
    'ASA-5505': 'firewall',
    'PIX': 'firewall',
    'phone': 'phone',
    'IP-Phone': 'phone',
    '7960': 'phone',
    'wireless': 'wireless',
    'Access-Point': 'access-point',
    'Access-Point-PT': 'access-point',
    'AP': 'access-point',
    'cloud': 'cloud',
    'Cloud-PT': 'cloud',
    'WAN-Emulator': 'cloud',
    'hub': 'hub',
    'Hub-PT': 'hub',
    'tv': 'tv',
    'TV-PT': 'tv',
    'tablet': 'tablet',
    'Tablet-PT': 'tablet',
}


def _normalize_device_type(raw_type: str) -> str:
    """规范化设备类型"""
    if not raw_type:
        return 'unknown'
    # 精确匹配
    if raw_type in DEVICE_TYPE_MAP:
        return DEVICE_TYPE_MAP[raw_type]
    # 模糊匹配（包含关键词）
    lower = raw_type.lower()
    for keyword, normalized in DEVICE_TYPE_MAP.items():
        if keyword.lower() in lower:
            return normalized
    return 'unknown'


# ============== 线缆类型识别 ==============

CABLE_TYPE_MAP = {
    'Straight': 'straight',
    'Copper-Straight': 'straight',
    'Cross-Over': 'crossover',
    'Copper-Cross-Over': 'crossover',
    'Fiber': 'fiber',
    'Fiber-Straight': 'fiber',
    'Serial': 'serial',
    'Serial-DCE': 'serial-dce',
    'Serial-DTE': 'serial-dte',
    'Console': 'console',
    'Coaxial': 'coaxial',
    'Wireless': 'wireless',
}


def _normalize_cable_type(raw_type: str) -> str:
    """规范化线缆类型"""
    if not raw_type:
        return 'unknown'
    if raw_type in CABLE_TYPE_MAP:
        return CABLE_TYPE_MAP[raw_type]
    lower = raw_type.lower()
    for keyword, normalized in CABLE_TYPE_MAP.items():
        if keyword.lower() in lower:
            return normalized
    return 'unknown'


# ============== 设备解析 ==============

def _find_devices(root: ET.Element) -> list:
    """查找所有设备节点

    PT XML 中设备可能在以下路径：
    - NETWORK/DEVICES/DEVICE
    - NETWORK/DEVICES/DEVICE_LIST/DEVICE
    - .//DEVICE（任意深度）
    """
    devices = []

    # 尝试多种路径
    device_nodes = root.findall('.//DEVICE')
    if not device_nodes:
        # 尝试小写标签
        device_nodes = root.findall('.//device')

    for node in device_nodes:
        device = _parse_device_node(node)
        if device:
            devices.append(device)

    return devices


def _parse_device_node(node: ET.Element) -> dict:
    """解析单个设备节点"""
    # 设备名
    name = node.get('NAME') or node.get('name') or ''
    # 设备类型
    raw_type = node.get('TYPE') or node.get('type') or node.get('DEVICE_TYPE') or ''
    device_type = _normalize_device_type(raw_type)
    # 设备 ID
    dev_id = node.get('DBID') or node.get('id') or node.get('ID') or name
    # 坐标
    x = _parse_float(node.get('POSITION_X') or node.get('X') or node.get('x') or '0')
    y = _parse_float(node.get('POSITION_Y') or node.get('Y') or node.get('y') or '0')
    # 型号
    model = node.get('MODEL') or node.get('model') or raw_type or ''

    if not name and not raw_type:
        return None

    return {
        'id': str(dev_id),
        'name': name,
        'type': device_type,
        'rawType': raw_type,
        'model': model,
        'x': x,
        'y': y,
    }


def _parse_float(val: str, default: float = 0.0) -> float:
    """安全解析浮点数"""
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


# ============== 链路解析 ==============

def _find_links(root: ET.Element) -> list:
    """查找所有链路节点

    PT XML 中链路在 LINKS/LINK 下
    """
    links = []

    link_nodes = root.findall('.//LINK')
    if not link_nodes:
        link_nodes = root.findall('.//link')

    for node in link_nodes:
        link = _parse_link_node(node)
        if link:
            links.append(link)

    return links


def _parse_link_node(node: ET.Element) -> dict:
    """解析单个链路节点"""
    # 链路 ID
    link_id = node.get('DBID') or node.get('id') or node.get('ID') or ''
    # 线缆类型
    cable_raw = node.get('CABLE_TYPE') or node.get('cableType') or node.get('TYPE') or ''
    cable_type = _normalize_cable_type(cable_raw)

    # 两端设备 ID 和接口
    src_dev = node.get('SRC_DEVICE') or node.get('srcDevice') or node.get('FROM') or ''
    dst_dev = node.get('DST_DEVICE') or node.get('dstDevice') or node.get('TO') or ''
    src_if = node.get('SRC_PORT') or node.get('srcPort') or node.get('SRC_INTERFACE') or ''
    dst_if = node.get('DST_PORT') or node.get('dstPort') or node.get('DST_INTERFACE') or ''

    # 尝试从子节点解析（PT 某些版本使用子节点存储端点信息）
    if not src_dev or not dst_dev:
        for child in node:
            tag = child.tag.upper()
            if tag in ('FROM', 'SRC', 'SOURCE', 'ENDPOINT1'):
                src_dev = src_dev or child.get('DEVICE') or child.get('device') or child.text or ''
                src_if = src_if or child.get('PORT') or child.get('port') or child.get('INTERFACE') or ''
            elif tag in ('TO', 'DST', 'DEST', 'ENDPOINT2'):
                dst_dev = dst_dev or child.get('DEVICE') or child.get('device') or child.text or ''
                dst_if = dst_if or child.get('PORT') or child.get('port') or child.get('INTERFACE') or ''

    if not src_dev and not dst_dev:
        return None

    return {
        'id': str(link_id),
        'srcDevice': str(src_dev),
        'dstDevice': str(dst_dev),
        'srcInterface': str(src_if),
        'dstInterface': str(dst_if),
        'cableType': cable_type,
        'cableRawType': cable_raw,
    }


# ============== 配置解析 ==============

def _find_configs(root: ET.Element) -> list:
    """查找设备配置文本

    PT XML 中配置可能在：
    - DEVICE/CONFIGURATION
    - DEVICE/IOS_CONFIG
    - DEVICE/CONFIG
    - .//CONFIGURATION
    """
    configs = []

    # 查找所有带配置的设备节点
    for device_node in root.findall('.//DEVICE'):
        dev_name = device_node.get('NAME') or device_node.get('name') or ''
        dev_id = device_node.get('DBID') or device_node.get('id') or dev_name

        config_text = None
        # 尝试多种配置标签
        for tag in ['CONFIGURATION', 'IOS_CONFIG', 'CONFIG', 'STARTUP_CONFIG', 'RUNNING_CONFIG']:
            config_node = device_node.find(tag)
            if config_node is not None and config_node.text:
                config_text = config_node.text.strip()
                break

        if config_text:
            configs.append({
                'deviceId': str(dev_id),
                'deviceName': dev_name,
                'config': config_text,
            })

    return configs


# ============== 接口表解析（从配置推算） ==============

# 接口名匹配正则
INTERFACE_PATTERN = re.compile(
    r'^interface\s+('
    r'(?:GigabitEthernet|FastEthernet|Ethernet|Serial|Loopback|Tunnel|Vlan|Port-channel|'
    r'gi|fa|eth|se|lo|tu|vl|po)'
    r'\d+(?:\.\d+)?(?:/\d+)*(?:\.\d+)?'
    r')',
    re.MULTILINE
)

# IP 地址匹配
IP_PATTERN = re.compile(
    r'^\s*ip address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)',
    re.MULTILINE
)

# CIDR 格式 IP
IP_CIDR_PATTERN = re.compile(
    r'^\s*ip address\s+(\d+\.\d+\.\d+\.\d+/\d+)',
    re.MULTILINE
)

# 带宽
BANDWIDTH_PATTERN = re.compile(r'^\s*bandwidth\s+(\d+)', re.MULTILINE)

# 双工
DUPLEX_PATTERN = re.compile(r'^\s*duplex\s+(\w+)', re.MULTILINE)

# 速率
SPEED_PATTERN = re.compile(r'^\s*speed\s+(\w+)', re.MULTILINE)

# 接口描述
DESCRIPTION_PATTERN = re.compile(r'^\s*description\s+(.+)$', re.MULTILINE)

# shutdown 状态
SHUTDOWN_PATTERN = re.compile(r'^\s*shutdown\s*$', re.MULTILINE)


def parse_interfaces_from_config(config: str) -> list:
    """从 Cisco IOS 配置文本中解析接口表

    解析：接口名/IP/掩码/描述/带宽/双工/速率/shutdown 状态
    """
    if not config:
        return []

    interfaces = []

    # 按 interface 分块
    blocks = re.split(r'^interface\s+', config, flags=re.MULTILINE)

    for block in blocks[1:]:  # 跳过第一块（interface 之前的内容）
        lines = block.strip().split('\n')
        if_name = lines[0].strip()

        # 提取 IP 和掩码
        ip_match = IP_PATTERN.search(block)
        ip_cidr_match = IP_CIDR_PATTERN.search(block)
        ip = ''
        mask = ''
        if ip_match:
            ip = ip_match.group(1)
            mask = ip_match.group(2)
        elif ip_cidr_match:
            cidr = ip_cidr_match.group(1)
            ip = cidr.split('/')[0]
            mask = _cidr_to_mask(int(cidr.split('/')[1]))

        # 带宽
        bw_match = BANDWIDTH_PATTERN.search(block)
        bandwidth = int(bw_match.group(1)) if bw_match else None

        # 双工
        dup_match = DUPLEX_PATTERN.search(block)
        duplex = dup_match.group(1) if dup_match else ''

        # 速率
        spd_match = SPEED_PATTERN.search(block)
        speed = spd_match.group(1) if spd_match else ''

        # 描述
        desc_match = DESCRIPTION_PATTERN.search(block)
        description = desc_match.group(1).strip() if desc_match else ''

        # shutdown 状态
        is_shutdown = bool(SHUTDOWN_PATTERN.search(block))

        interfaces.append({
            'name': if_name,
            'ip': ip,
            'mask': mask,
            'cidr': _mask_to_cidr(mask) if mask else None,
            'description': description,
            'bandwidth': bandwidth,
            'duplex': duplex,
            'speed': speed,
            'shutdown': is_shutdown,
            'status': 'down' if is_shutdown else ('up' if ip else 'no-ip'),
        })

    return interfaces


def _cidr_to_mask(cidr: int) -> str:
    """CIDR 转子网掩码"""
    if not (0 <= cidr <= 32):
        return '0.0.0.0'
    mask = (0xFFFFFFFF << (32 - cidr)) & 0xFFFFFFFF
    return f'{(mask >> 24) & 0xFF}.{(mask >> 16) & 0xFF}.{(mask >> 8) & 0xFF}.{mask & 0xFF}'


def _mask_to_cidr(mask: str) -> int:
    """子网掩码转 CIDR"""
    try:
        parts = mask.split('.')
        if len(parts) != 4:
            return 0
        bits = 0
        for part in parts:
            bits += bin(int(part)).count('1')
        return bits
    except (ValueError, AttributeError):
        return 0


# ============== VLAN 解析 ==============

VLAN_PATTERN = re.compile(
    r'^vlan\s+(\d+)\s*\n\s*name\s+(.+)$',
    re.MULTILINE
)

VLAN_RANGE_PATTERN = re.compile(
    r'^vlan\s+(\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)\s*$',
    re.MULTILINE
)


def parse_vlans_from_config(config: str) -> list:
    """从配置中解析 VLAN"""
    if not config:
        return []

    vlans = []

    # 匹配带名称的 VLAN
    for match in VLAN_PATTERN.finditer(config):
        vlan_id = match.group(1)
        name = match.group(2).strip()
        vlans.append({
            'id': vlan_id,
            'name': name,
        })

    # 匹配仅 ID 的 VLAN（如果还没被上面匹配）
    for match in VLAN_RANGE_PATTERN.finditer(config):
        vlan_range = match.group(1)
        for part in vlan_range.split(','):
            if '-' in part:
                start, end = part.split('-')
                for i in range(int(start), int(end) + 1):
                    if not any(v['id'] == str(i) for v in vlans):
                        vlans.append({'id': str(i), 'name': f'VLAN{i}'})
            else:
                if not any(v['id'] == part for v in vlans):
                    vlans.append({'id': part, 'name': f'VLAN{part}'})

    return vlans


# ============== ACL 解析 ==============

ACL_PATTERN = re.compile(
    r'^(ip access-list (?:standard|extended)\s+(\S+)\s*\n((?:\s+\S.*\n?)*))',
    re.MULTILINE
)

ACL_LEGACY_PATTERN = re.compile(
    r'^(access-list\s+(\d+)\s+(.+))$',
    re.MULTILINE
)


def parse_acls_from_config(config: str) -> list:
    """从配置中解析 ACL 规则"""
    if not config:
        return []

    acls = []

    # 新式 ACL（ip access-list）
    for match in ACL_PATTERN.finditer(config):
        full = match.group(1).strip()
        name = match.group(2)
        body = match.group(3).strip()
        rules = [line.strip() for line in body.split('\n') if line.strip()]
        acls.append({
            'name': name,
            'type': 'named',
            'rules': rules,
            'raw': full,
        })

    # 旧式 ACL（access-list N ...）
    for match in ACL_LEGACY_PATTERN.finditer(config):
        full = match.group(1).strip()
        num = match.group(2)
        body = match.group(3).strip()
        # 查找是否已有同编号的 ACL
        existing = next((a for a in acls if a['name'] == num), None)
        if existing:
            existing['rules'].append(body)
            existing['raw'] += '\n' + full
        else:
            acls.append({
                'name': num,
                'type': 'numbered',
                'rules': [body],
                'raw': full,
            })

    return acls


# ============== 路由表推算 ==============

# 静态路由
STATIC_ROUTE_PATTERN = re.compile(
    r'^ip route\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+(\S+)(?:\s+(\d+))?',
    re.MULTILINE
)

# OSPF 路由
OSPF_NETWORK_PATTERN = re.compile(
    r'^router ospf\s+(\d+)\s*\n((?:\s+network\s+\S+\s+\S+\s+area\s+\S+\s*\n?)+)',
    re.MULTILINE
)

OSPF_NETWORK_DETAIL = re.compile(
    r'network\s+(\S+)\s+(\S+)\s+area\s+(\S+)'
)


def parse_routes_from_config(config: str, interfaces: list) -> list:
    """从配置推算路由表

    包含：
    1. 直连路由（从接口 IP 推算）
    2. 静态路由（ip route 命令）
    3. OSPF 路由（router ospf + network 命令）
    """
    if not config:
        return []

    routes = []

    # 1. 直连路由（从接口推算）
    for iface in interfaces:
        if iface['ip'] and iface['mask'] and not iface['shutdown']:
            cidr = iface.get('cidr') or _mask_to_cidr(iface['mask'])
            network = _get_network_address(iface['ip'], iface['mask'])
            if network:
                routes.append({
                    'type': 'connected',
                    'network': network,
                    'mask': iface['mask'],
                    'cidr': cidr,
                    'nextHop': 'directly connected',
                    'interface': iface['name'],
                    'source': 'interface',
                })

    # 2. 静态路由
    for match in STATIC_ROUTE_PATTERN.finditer(config):
        network = match.group(1)
        mask = match.group(2)
        next_hop = match.group(3)
        metric = match.group(4)
        routes.append({
            'type': 'static',
            'network': network,
            'mask': mask,
            'cidr': _mask_to_cidr(mask),
            'nextHop': next_hop,
            'metric': int(metric) if metric else 1,
            'interface': '',
            'source': 'ip route',
        })

    # 3. OSPF 路由
    for match in OSPF_NETWORK_PATTERN.finditer(config):
        process_id = match.group(1)
        networks_block = match.group(2)
        for net_match in OSPF_NETWORK_DETAIL.finditer(networks_block):
            network = net_match.group(1)
            wildcard = net_match.group(2)
            area = net_match.group(3)
            # 通配符转掩码
            mask = _wildcard_to_mask(wildcard)
            routes.append({
                'type': 'ospf',
                'network': network,
                'mask': mask,
                'cidr': _mask_to_cidr(mask),
                'nextHop': f'OSPF area {area}',
                'processId': process_id,
                'area': area,
                'interface': '',
                'source': 'router ospf',
            })

    return routes


def _get_network_address(ip: str, mask: str) -> str:
    """计算网络地址"""
    try:
        ip_parts = [int(x) for x in ip.split('.')]
        mask_parts = [int(x) for x in mask.split('.')]
        if len(ip_parts) != 4 or len(mask_parts) != 4:
            return ''
        network_parts = [ip_parts[i] & mask_parts[i] for i in range(4)]
        return '.'.join(str(x) for x in network_parts)
    except (ValueError, AttributeError):
        return ''


def _wildcard_to_mask(wildcard: str) -> str:
    """通配符掩码转子网掩码"""
    try:
        parts = [int(x) for x in wildcard.split('.')]
        if len(parts) != 4:
            return '0.0.0.0'
        mask_parts = [255 - x for x in parts]
        return '.'.join(str(x) for x in mask_parts)
    except (ValueError, AttributeError):
        return '0.0.0.0'


# ============== 设备分组解析 ==============

def _find_groups(root: ET.Element) -> list:
    """查找设备分组/集群信息"""
    groups = []

    # 尝试查找集群/分组节点
    for tag in ['CLUSTER', 'GROUP', 'cluster', 'group']:
        for node in root.findall(f'.//{tag}'):
            name = node.get('NAME') or node.get('name') or '未命名分组'
            # 查找组内设备
            members = []
            for member in node.findall('.//MEMBER'):
                dev_id = member.get('DEVICE') or member.get('device') or member.text
                if dev_id:
                    members.append(str(dev_id))
            if members:
                groups.append({
                    'name': name,
                    'members': members,
                })

    return groups


# ============== 统一解析入口 ==============

def parse_xml(xml_text: str) -> dict:
    """解析 PT XML 文本，返回结构化数据

    返回结构：
    {
        'devices': [...],
        'links': [...],
        'configs': [...],
        'interfaces': {deviceId: [...]},
        'vlans': {deviceId: [...]},
        'acls': {deviceId: [...]},
        'routes': {deviceId: [...]},
        'groups': [...],
    }
    """
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        raise ValueError(f"XML 解析失败：{e}")

    # 解析设备
    devices = _find_devices(root)

    # 解析链路
    links = _find_links(root)

    # 解析配置
    configs = _find_configs(root)

    # 从配置推算接口表/VLAN/ACL/路由
    interfaces_by_device = {}
    vlans_by_device = {}
    acls_by_device = {}
    routes_by_device = {}

    for cfg in configs:
        dev_id = cfg['deviceId']
        config_text = cfg['config']

        interfaces_by_device[dev_id] = parse_interfaces_from_config(config_text)
        vlans_by_device[dev_id] = parse_vlans_from_config(config_text)
        acls_by_device[dev_id] = parse_acls_from_config(config_text)
        routes_by_device[dev_id] = parse_routes_from_config(
            config_text,
            interfaces_by_device[dev_id]
        )

    # 解析分组
    groups = _find_groups(root)

    return {
        'devices': devices,
        'links': links,
        'configs': configs,
        'interfaces': interfaces_by_device,
        'vlans': vlans_by_device,
        'acls': acls_by_device,
        'routes': routes_by_device,
        'groups': groups,
    }
