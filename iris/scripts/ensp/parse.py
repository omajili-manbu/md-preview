"""Huawei eNSP XML 解析模块

解析 .topo 文件的 XML 结构，提取：
- 设备列表（类型/名称/坐标/型号）
- 链路列表（设备间连接/接口/线缆类型）
- 设备配置（.cfg 文件中的 VRP 配置命令）
- 接口表（IP/掩码/状态/速率/双工）
- VLAN 信息
- ACL 规则
- 路由表（从配置推算：静态路由 + 直连路由）

eNSP .topo 文件是 UTF-8 编码的 XML，结构随版本略有差异。
本模块兼容常见 eNSP 版本的主要节点命名。
"""

import re
import xml.etree.ElementTree as ET


# ============== 设备类型识别 ==============

# eNSP 中设备类型的识别映射（不区分大小写）
DEVICE_TYPE_MAP = {
    'router': 'router',
    'AR1220': 'router',
    'AR1220-S': 'router',
    'AR2220': 'router',
    'AR2220-S': 'router',
    'AR2240': 'router',
    'AR2240-S': 'router',
    'AR3260': 'router',
    'AR4640': 'router',
    'NE40E': 'router',
    'NE5000E': 'router',
    'NE80E': 'router',
    'switch': 'switch',
    'LSW5700': 'switch',
    'LSW3700': 'switch',
    'LSW2403H': 'switch',
    'LSW2403TP': 'switch',
    'S5700': 'switch',
    'S3700': 'switch',
    'S2700': 'switch',
    'S3500': 'switch',
    'S5000': 'switch',
    'pc': 'pc',
    'PC-PT': 'pc',
    'PC': 'pc',
    'server': 'server',
    'Server-PT': 'server',
    'Server': 'server',
    'firewall': 'firewall',
    'USG6000': 'firewall',
    'USG2000': 'firewall',
    'cloud': 'cloud',
    'Cloud': 'cloud',
    'hub': 'hub',
    'Hub': 'hub',
    'wireless': 'wireless',
    'AP': 'access-point',
    'phone': 'phone',
    'IP-Phone': 'phone',
}


def _normalize_device_type(raw_type: str) -> str:
    """规范化设备类型"""
    if not raw_type:
        return 'unknown'
    if raw_type in DEVICE_TYPE_MAP:
        return DEVICE_TYPE_MAP[raw_type]
    lower = raw_type.lower()
    for keyword, normalized in DEVICE_TYPE_MAP.items():
        if keyword.lower() in lower:
            return normalized
    return 'unknown'


# ============== 线缆类型识别 ==============

CABLE_TYPE_MAP = {
    'Copper': 'copper',
    'copper': 'copper',
    'Fiber': 'fiber',
    'fiber': 'fiber',
    'Serial': 'serial',
    'serial': 'serial',
    'Console': 'console',
    'console': 'console',
    'Cross-Over': 'crossover',
    'cross-over': 'crossover',
    'Straight': 'straight',
    'straight': 'straight',
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


# ============== 通用工具函数 ==============

def _get_text(node: ET.Element, path: str) -> str:
    """安全获取子节点文本内容"""
    if node is None:
        return ''
    paths = path.split('|')
    for p in paths:
        child = node.find(p.strip())
        if child is not None and child.text:
            return child.text.strip()
    return ''


def _parse_float(val: str, default: float = 0.0) -> float:
    """安全解析浮点数"""
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _extract_uuid(raw_id: str) -> str:
    """提取纯 UUID，去除前缀

    支持格式：
    - uuid:xxx → xxx
    - xxx（纯数字或字符串）→ xxx
    """
    if not raw_id:
        return ''
    if raw_id.startswith('uuid:'):
        return raw_id[5:]
    if raw_id.startswith('UUID:'):
        return raw_id[5:]
    return raw_id


# ============== 设备解析 ==============

def _find_devices(root: ET.Element) -> list:
    """查找所有设备节点

    eNSP XML 中设备在 Devices/Device 下
    """
    devices = []

    device_nodes = root.findall('.//Device')
    if not device_nodes:
        device_nodes = root.findall('.//device')
    if not device_nodes:
        devices_node = root.find('Devices')
        if devices_node is not None:
            device_nodes = devices_node.findall('Device')
            if not device_nodes:
                device_nodes = devices_node.findall('device')

    for node in device_nodes:
        device = _parse_device_node(node)
        if device:
            devices.append(device)

    return devices


def _parse_device_node(node: ET.Element) -> dict:
    """解析单个设备节点

    eNSP 设备节点结构：
    <Device>
        <uuid>xxx</uuid>
        <model>AR1220</model>
        <name>R1</name>
        <x>100</x>
        <y>200</y>
        <icon>...</icon>
    </Device>
    """
    # 设备 ID
    dev_id = _extract_uuid(_get_text(node, 'uuid|UUID'))
    if not dev_id:
        dev_id = _get_text(node, 'id|ID')

    # 设备名
    name = _get_text(node, 'name|NAME')

    # 设备型号
    model = _get_text(node, 'model|MODEL')

    # 设备类型（根据 model 映射）
    device_type = _normalize_device_type(model)

    # 坐标
    x = _parse_float(_get_text(node, 'x|X'))
    y = _parse_float(_get_text(node, 'y|Y'))

    # 图标（可选）
    icon = _get_text(node, 'icon|ICON')

    if not name and not model:
        return None

    return {
        'id': str(dev_id) if dev_id else name,
        'name': name,
        'type': device_type,
        'rawType': model,
        'model': model,
        'x': x,
        'y': y,
        'icon': icon,
    }


# ============== 链路解析 ==============

def _find_links(root: ET.Element) -> list:
    """查找所有链路节点

    eNSP XML 中链路在 Lines/Line 下
    """
    links = []

    link_nodes = root.findall('.//Line')
    if not link_nodes:
        link_nodes = root.findall('.//line')
    if not link_nodes:
        lines_node = root.find('Lines')
        if lines_node is not None:
            link_nodes = lines_node.findall('Line')
            if not link_nodes:
                link_nodes = lines_node.findall('line')

    for node in link_nodes:
        link = _parse_link_node(node)
        if link:
            links.append(link)

    return links


def _parse_link_node(node: ET.Element) -> dict:
    """解析单个链路节点

    eNSP 链路节点结构：
    <Line>
        <interfacePair>
            <source>uuid:xxx,port:GigabitEthernet0/0/0</source>
            <target>uuid:yyy,port:GigabitEthernet0/0/1</target>
        </interfacePair>
        <type>Copper</type>
    </Line>
    """
    # 链路 ID（eNSP 通常没有显式 ID，用索引生成）
    link_id = _get_text(node, 'id|ID')

    # 线缆类型
    cable_raw = _get_text(node, 'type|TYPE')
    cable_type = _normalize_cable_type(cable_raw)

    # 两端设备 ID 和接口
    src_dev = ''
    dst_dev = ''
    src_if = ''
    dst_if = ''

    interface_pair = node.find('interfacePair')
    if interface_pair is None:
        interface_pair = node.find('InterfacePair')
    if interface_pair is None:
        interface_pair = node.find('interfacepair')

    if interface_pair is not None:
        source_text = _get_text(interface_pair, 'source|SOURCE')
        target_text = _get_text(interface_pair, 'target|TARGET')

        # 解析 source: uuid:xxx,port:GigabitEthernet0/0/0
        if source_text:
            parts = source_text.split(',')
            for part in parts:
                part = part.strip()
                if part.startswith('uuid:') or part.startswith('UUID:'):
                    src_dev = _extract_uuid(part)
                elif part.startswith('port:') or part.startswith('PORT:'):
                    src_if = part[5:].strip()

        # 解析 target
        if target_text:
            parts = target_text.split(',')
            for part in parts:
                part = part.strip()
                if part.startswith('uuid:') or part.startswith('UUID:'):
                    dst_dev = _extract_uuid(part)
                elif part.startswith('port:') or part.startswith('PORT:'):
                    dst_if = part[5:].strip()

    # 备用解析路径（其他可能的结构）
    if not src_dev or not dst_dev:
        src_dev = _extract_uuid(_get_text(node, 'source|SOURCE')) or src_dev
        dst_dev = _extract_uuid(_get_text(node, 'target|TARGET')) or dst_dev
        src_if = _get_text(node, 'srcPort|src_port|SOURCE_PORT') or src_if
        dst_if = _get_text(node, 'dstPort|dst_port|TARGET_PORT') or dst_if

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


# ============== 配置解析（从 .cfg 文件） ==============

def parse_config_from_file(config_path: str) -> str:
    """从 .cfg 文件读取配置文本"""
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    except UnicodeDecodeError:
        try:
            with open(config_path, 'r', encoding='gbk') as f:
                return f.read().strip()
        except Exception:
            return ''
    except Exception:
        return ''


def _find_configs(root: ET.Element, topo_dir: str) -> list:
    """查找设备配置文本

    eNSP 的配置通常不存于 .topo 文件中，而是单独的 .cfg 文件。
    .cfg 文件命名通常为：设备名.cfg 或 uuid.cfg
    """
    import os

    configs = []

    device_nodes = root.findall('.//Device')
    if not device_nodes:
        device_nodes = root.findall('.//device')

    for device_node in device_nodes:
        dev_id = _extract_uuid(_get_text(device_node, 'uuid|UUID'))
        if not dev_id:
            dev_id = _get_text(device_node, 'id|ID')
        dev_name = _get_text(device_node, 'name|NAME')

        if not dev_id and not dev_name:
            continue

        # 尝试查找 .cfg 文件
        config_text = ''
        possible_names = []
        if dev_name:
            possible_names.append(f'{dev_name}.cfg')
            possible_names.append(f'{dev_name.lower()}.cfg')
        if dev_id:
            possible_names.append(f'{dev_id}.cfg')

        for cfg_name in possible_names:
            cfg_path = os.path.join(topo_dir, cfg_name)
            if os.path.exists(cfg_path):
                config_text = parse_config_from_file(cfg_path)
                break

        if config_text:
            configs.append({
                'deviceId': str(dev_id) if dev_id else dev_name,
                'deviceName': dev_name,
                'config': config_text,
            })

    return configs


# ============== 接口表解析（从 VRP 配置） ==============

INTERFACE_PATTERN = re.compile(
    r'^interface\s+('
    r'(?:GigabitEthernet|FastEthernet|Ethernet|Serial|Loopback|Tunnel|Vlan|Port-channel|'
    r'gi|fa|eth|se|lo|tu|vl|po)'
    r'\d+(?:\.\d+)?(?:/\d+)*(?:\.\d+)?'
    r')',
    re.MULTILINE
)

IP_PATTERN = re.compile(
    r'^\s*ip address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)',
    re.MULTILINE
)

IP_CIDR_PATTERN = re.compile(
    r'^\s*ip address\s+(\d+\.\d+\.\d+\.\d+/\d+)',
    re.MULTILINE
)

BANDWIDTH_PATTERN = re.compile(r'^\s*bandwidth\s+(\d+)', re.MULTILINE)

DUPLEX_PATTERN = re.compile(r'^\s*duplex\s+(\w+)', re.MULTILINE)

SPEED_PATTERN = re.compile(r'^\s*speed\s+(\w+)', re.MULTILINE)

DESCRIPTION_PATTERN = re.compile(r'^\s*description\s+(.+)$', re.MULTILINE)

SHUTDOWN_PATTERN = re.compile(r'^\s*shutdown\s*$', re.MULTILINE)


def parse_interfaces_from_config(config: str) -> list:
    """从 VRP 配置文本中解析接口表"""
    if not config:
        return []

    interfaces = []

    blocks = re.split(r'^interface\s+', config, flags=re.MULTILINE)

    for block in blocks[1:]:
        lines = block.strip().split('\n')
        if_name = lines[0].strip()

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

        bw_match = BANDWIDTH_PATTERN.search(block)
        bandwidth = int(bw_match.group(1)) if bw_match else None

        dup_match = DUPLEX_PATTERN.search(block)
        duplex = dup_match.group(1) if dup_match else ''

        spd_match = SPEED_PATTERN.search(block)
        speed = spd_match.group(1) if spd_match else ''

        desc_match = DESCRIPTION_PATTERN.search(block)
        description = desc_match.group(1).strip() if desc_match else ''

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
            'mac': '',
            'gateway': '',
            'dns': '',
            'dhcp': False,
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

    for match in VLAN_PATTERN.finditer(config):
        vlan_id = match.group(1)
        name = match.group(2).strip()
        vlans.append({
            'id': vlan_id,
            'name': name,
        })

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

    for match in ACL_LEGACY_PATTERN.finditer(config):
        full = match.group(1).strip()
        num = match.group(2)
        body = match.group(3).strip()
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

STATIC_ROUTE_PATTERN = re.compile(
    r'^ip route\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+(\S+)(?:\s+(\d+))?',
    re.MULTILINE
)

OSPF_NETWORK_PATTERN = re.compile(
    r'^router ospf\s+(\d+)\s*\n((?:\s+network\s+\S+\s+\S+\s+area\s+\S+\s*\n?)+)',
    re.MULTILINE
)

OSPF_NETWORK_DETAIL = re.compile(
    r'network\s+(\S+)\s+(\S+)\s+area\s+(\S+)'
)

BGP_BLOCK_PATTERN = re.compile(
    r'^router bgp\s+(\d+)\s*\n(.*?)(?=^!|^router\s|^ip\s|\Z)',
    re.MULTILINE | re.DOTALL
)

BGP_NETWORK_PATTERN = re.compile(
    r'^\s*network\s+(\d+\.\d+\.\d+\.\d+)(?:\s+mask\s+(\d+\.\d+\.\d+\.\d+))?',
    re.MULTILINE
)

BGP_NEIGHBOR_PATTERN = re.compile(
    r'^\s*neighbor\s+(\d+\.\d+\.\d+\.\d+)\s+remote-as\s+(\d+)',
    re.MULTILINE
)

RIP_BLOCK_PATTERN = re.compile(
    r'^router rip\s*\n(.*?)(?=^!|^router\s|^ip\s|\Z)',
    re.MULTILINE | re.DOTALL
)

RIP_NETWORK_PATTERN = re.compile(
    r'^\s*network\s+(\d+\.\d+\.\d+\.\d+)',
    re.MULTILINE
)


def parse_routes_from_config(config: str, interfaces: list) -> list:
    """从配置推算路由表"""
    if not config:
        return []

    routes = []

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

    for match in STATIC_ROUTE_PATTERN.finditer(config):
        network = match.group(1)
        mask = match.group(2)
        next_hop = match.group(3)
        metric = match.group(4)
        is_default = (network == '0.0.0.0' and mask == '0.0.0.0')
        routes.append({
            'type': 'default' if is_default else 'static',
            'network': network,
            'mask': mask,
            'cidr': _mask_to_cidr(mask),
            'nextHop': next_hop,
            'metric': int(metric) if metric else 1,
            'interface': '',
            'source': 'ip route',
        })

    for match in OSPF_NETWORK_PATTERN.finditer(config):
        process_id = match.group(1)
        networks_block = match.group(2)
        for net_match in OSPF_NETWORK_DETAIL.finditer(networks_block):
            network = net_match.group(1)
            wildcard = net_match.group(2)
            area = net_match.group(3)
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

    for match in BGP_BLOCK_PATTERN.finditer(config):
        process_id = match.group(1)
        block = match.group(2)
        neighbors = []
        for nbr_match in BGP_NEIGHBOR_PATTERN.finditer(block):
            neighbors.append({
                'ip': nbr_match.group(1),
                'remoteAs': nbr_match.group(2),
            })
        for net_match in BGP_NETWORK_PATTERN.finditer(block):
            network = net_match.group(1)
            mask = net_match.group(2)
            if not mask:
                mask = _classful_mask(network)
            routes.append({
                'type': 'bgp',
                'network': network,
                'mask': mask,
                'cidr': _mask_to_cidr(mask),
                'nextHop': f'BGP AS {process_id}',
                'processId': process_id,
                'neighbors': neighbors,
                'interface': '',
                'source': 'bgp',
            })

    for match in RIP_BLOCK_PATTERN.finditer(config):
        block = match.group(1)
        for net_match in RIP_NETWORK_PATTERN.finditer(block):
            network = net_match.group(1)
            mask = _classful_mask(network)
            routes.append({
                'type': 'rip',
                'network': network,
                'mask': mask,
                'cidr': _mask_to_cidr(mask),
                'nextHop': 'RIP',
                'processId': 'rip',
                'interface': '',
                'source': 'rip',
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


def _classful_mask(ip: str) -> str:
    """根据 IP 主类推算默认掩码"""
    try:
        first = int(ip.split('.')[0])
        if 1 <= first <= 126:
            return '255.0.0.0'
        elif 128 <= first <= 191:
            return '255.255.0.0'
        elif 192 <= first <= 223:
            return '255.255.255.0'
        return '255.255.255.0'
    except (ValueError, IndexError):
        return '255.255.255.0'


# ============== 统一解析入口 ==============

def parse_xml(xml_text: str, topo_dir: str = '') -> dict:
    """解析 eNSP XML 文本，返回结构化数据

    参数：
        xml_text: .topo 文件的 XML 文本
        topo_dir: .topo 文件所在目录，用于查找 .cfg 文件

    返回结构：
    {
        'devices': [...],
        'links': [...],
        'configs': [...],
        'interfaces': {deviceId: [...]},
        'vlans': {deviceId: [...]},
        'acls': {deviceId: [...]},
        'routes': {deviceId: [...]},
        'groups': [],
    }
    """
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        raise ValueError(f"XML 解析失败：{e}")

    devices = _find_devices(root)

    id_mapping = {}
    for idx, dev in enumerate(devices, start=1):
        old_id = dev['id']
        new_id = str(idx)
        id_mapping[old_id] = new_id
        dev['id'] = new_id

    links = _find_links(root)

    for idx, link in enumerate(links, start=1):
        link['id'] = f'L{idx}'
        old_src = link['srcDevice']
        if old_src in id_mapping:
            link['srcDevice'] = id_mapping[old_src]
        old_dst = link['dstDevice']
        if old_dst in id_mapping:
            link['dstDevice'] = id_mapping[old_dst]

    configs = _find_configs(root, topo_dir)

    for cfg in configs:
        old_id = cfg['deviceId']
        if old_id in id_mapping:
            cfg['deviceId'] = id_mapping[old_id]

    interfaces_by_device = {}
    vlans_by_device = {}
    acls_by_device = {}
    routes_by_device = {}

    config_device_ids = set()

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
        config_device_ids.add(dev_id)

    for dev in devices:
        dev_id = dev['id']
        if dev_id in config_device_ids:
            continue
        interfaces_by_device[dev_id] = []
        vlans_by_device[dev_id] = []
        acls_by_device[dev_id] = []
        routes_by_device[dev_id] = []

    return {
        'devices': devices,
        'links': links,
        'configs': configs,
        'interfaces': interfaces_by_device,
        'vlans': vlans_by_device,
        'acls': acls_by_device,
        'routes': routes_by_device,
        'groups': [],
    }
