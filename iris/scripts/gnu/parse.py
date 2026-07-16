"""Graphviz DOT 网络拓扑解析模块

解析 DOT 文件格式的网络拓扑，提取：
- 设备列表（类型/名称/坐标）
- 链路列表（设备间连接/接口/网段）
- 接口表（从链路推导）

支持的 DOT 语法示例：
    graph G {
        hostnametype="hostname"
        "R1":"GigabitEthernet0/0/0" -- "R2":"GigabitEthernet0/0/1" [label="172.16.1.0/24"];
        "R2":"GigabitEthernet0/0/0" -- "S1":"GigabitEthernet0/0/1";
        "S1":"GigabitEthernet0/0/2" -- "PC1":"FastEthernet0";
    }

设备类型推断：
- R/AR/NE 开头 → router
- S/LSW 开头 → switch
- PC 开头 → pc
- Server 开头 → server
- 其他 → unknown

端口名简化：
- GigabitEthernet0/0/0 → Gi0/0/0
- FastEthernet0/0 → Fa0/0
"""

import re
from typing import Dict, List, Tuple


def _remove_comments(dot_text: str) -> str:
    """移除 DOT 文件中的注释
    
    支持两种注释格式：
    - 块注释: /* ... */
    - 行注释: // ...
    """
    text = dot_text
    text = re.sub(r'/\*[\s\S]*?\*/', '', text)
    text = re.sub(r'//.*?$', '', text, flags=re.MULTILINE)
    return text


def _simplify_interface_name(name: str) -> str:
    """简化接口名
    
    GigabitEthernet0/0/0 → Gi0/0/0
    FastEthernet0/0 → Fa0/0
    """
    if not name:
        return ''
    name = name.strip()
    replacements = [
        ('GigabitEthernet', 'Gi'),
        ('FastEthernet', 'Fa'),
        ('Ethernet', 'Eth'),
        ('Serial', 'Se'),
        ('Loopback', 'Lo'),
        ('Tunnel', 'Tu'),
        ('Vlan', 'Vl'),
        ('Port-channel', 'Po'),
    ]
    for full, abbr in replacements:
        if name.startswith(full):
            return abbr + name[len(full):]
    return name


def _infer_device_type(device_name: str) -> str:
    """从设备名推断设备类型
    
    R/AR/NE 开头 → router
    Server 开头 → server
    S/LSW 开头 → switch（排除 Server）
    PC 开头 → pc
    其他 → unknown
    """
    if not device_name:
        return 'unknown'
    name = device_name.strip()
    name_upper = name.upper()
    if name_upper.startswith('R') or name_upper.startswith('AR') or name_upper.startswith('NE'):
        return 'router'
    if name_upper.startswith('SERVER'):
        return 'server'
    if name_upper.startswith('S') or name_upper.startswith('LSW'):
        return 'switch'
    if name_upper.startswith('PC'):
        return 'pc'
    return 'unknown'


def _generate_coordinates(device_names: List[str]) -> Dict[str, Tuple[float, float]]:
    """为设备生成默认坐标
    
    无坐标信息时，按行优先的网格布局生成。
    """
    coords = {}
    cols = 4
    for idx, name in enumerate(device_names):
        row = idx // cols
        col = idx % cols
        x = col * 200 + 100
        y = row * 150 + 100
        coords[name] = (x, y)
    return coords


def parse_dot(dot_text: str) -> Dict:
    """解析 DOT 文件文本，返回结构化数据
    
    返回结构：
    {
        'devices': [...],
        'links': [...],
        'configs': [],
        'interfaces': {deviceId: [...]},
        'vlans': {},
        'acls': {},
        'routes': {},
        'groups': [],
    }
    """
    text = _remove_comments(dot_text)

    devices = []
    links = []
    device_set = set()
    device_interfaces: Dict[str, List[Dict]] = {}

    edge_pattern = re.compile(
        r'"(\w+)"(?::"([^"]+)")?\s*--\s*"(\w+)"(?::"([^"]+)")?(?:\s*\[([^\]]+)\])?'
    )

    for match in edge_pattern.finditer(text):
        src_dev = match.group(1)
        src_if = match.group(2) or ''
        dst_dev = match.group(3)
        dst_if = match.group(4) or ''
        attrs = match.group(5) or ''

        device_set.add(src_dev)
        device_set.add(dst_dev)

        subnet = ''
        label_match = re.search(r'label\s*=\s*["\']([^"\']+)["\']', attrs)
        if label_match:
            label = label_match.group(1).strip()
            subnet_match = re.search(r'\d+\.\d+\.\d+\.\d+/\d+', label)
            if subnet_match:
                subnet = subnet_match.group(0)

        src_if_simplified = _simplify_interface_name(src_if)
        dst_if_simplified = _simplify_interface_name(dst_if)

        links.append({
            'id': '',
            'srcDevice': src_dev,
            'dstDevice': dst_dev,
            'srcInterface': src_if_simplified,
            'dstInterface': dst_if_simplified,
            'cableType': 'ethernet',
            'cableRawType': '',
            'subnet': subnet,
        })

        if src_dev not in device_interfaces:
            device_interfaces[src_dev] = []
        if src_if:
            device_interfaces[src_dev].append({
                'name': src_if_simplified,
                'ip': '',
                'mask': '',
                'cidr': None,
                'description': f'Connected to {dst_dev}',
                'bandwidth': None,
                'duplex': '',
                'speed': '',
                'shutdown': False,
                'status': 'up',
                'mac': '',
                'gateway': '',
                'dns': '',
                'dhcp': False,
            })

        if dst_dev not in device_interfaces:
            device_interfaces[dst_dev] = []
        if dst_if:
            device_interfaces[dst_dev].append({
                'name': dst_if_simplified,
                'ip': '',
                'mask': '',
                'cidr': None,
                'description': f'Connected to {src_dev}',
                'bandwidth': None,
                'duplex': '',
                'speed': '',
                'shutdown': False,
                'status': 'up',
                'mac': '',
                'gateway': '',
                'dns': '',
                'dhcp': False,
            })

    device_names = sorted(device_set)
    coords = _generate_coordinates(device_names)

    for idx, name in enumerate(device_names):
        dev_type = _infer_device_type(name)
        x, y = coords[name]
        devices.append({
            'id': str(idx + 1),
            'name': name,
            'type': dev_type,
            'rawType': dev_type,
            'model': '',
            'x': x,
            'y': y,
            'gateway': '',
            'dns': '',
            'mac': '',
        })

    id_mapping = {dev['name']: dev['id'] for dev in devices}

    for link in links:
        link['id'] = f"L{links.index(link) + 1}"
        link['srcDevice'] = id_mapping[link['srcDevice']]
        link['dstDevice'] = id_mapping[link['dstDevice']]

    interfaces_by_device = {}
    for dev in devices:
        dev_id = dev['id']
        dev_name = dev['name']
        interfaces_by_device[dev_id] = device_interfaces.get(dev_name, [])

    return {
        'devices': devices,
        'links': links,
        'configs': [],
        'interfaces': interfaces_by_device,
        'vlans': {},
        'acls': {},
        'routes': {},
        'groups': [],
    }
