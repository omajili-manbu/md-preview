"""Graphviz DOT → JSON 预处理脚本主入口

功能：
1. 扫描 iris/data/gnu/raw/ 下的所有 .dot 文件
2. 对比 mtime 实现增量处理
3. DOT 解析 → JSON 输出
4. 原始 DOT 存到 iris/data/gnu/xml/（中间产物）
5. 解析后的 JSON 存到 iris/data/gnu/json/
6. 失败时生成错误 JSON

用法：
    python iris/scripts/gnu/main.py              # 增量处理
    python iris/scripts/gnu/main.py --force      # 强制全量重建
    python iris/scripts/gnu/main.py --verbose    # 详细输出
"""

import argparse
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from parse import parse_dot
from output import build_topology_json, build_error_json, write_json, write_xml


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent

RAW_DIR = PROJECT_ROOT / 'iris' / 'data' / 'gnu' / 'raw'
XML_DIR = PROJECT_ROOT / 'iris' / 'data' / 'gnu' / 'xml'
JSON_DIR = PROJECT_ROOT / 'iris' / 'data' / 'gnu' / 'json'


def needs_rebuild(dot_path: Path, json_path: Path, force: bool = False) -> bool:
    """判断是否需要重新处理
    
    增量策略：文件 mtime 对比
    - force=True：强制重建
    - JSON 不存在：需要处理
    - .dot mtime > JSON mtime：需要处理
    """
    if force:
        return True
    if not json_path.exists():
        return True
    return dot_path.stat().st_mtime > json_path.stat().st_mtime


def process_dot(dot_path: Path, verbose: bool = False) -> dict:
    """处理单个 .dot 文件
    
    返回处理结果摘要
    """
    filename = dot_path.name
    stem = dot_path.stem
    xml_path = XML_DIR / f'{stem}.dot'
    json_path = JSON_DIR / f'{stem}.json'

    result = {
        'file': filename,
        'status': 'success',
        'deviceCount': 0,
        'linkCount': 0,
        'duration': 0,
        'error': None,
    }

    start_time = time.time()

    try:
        with open(dot_path, 'r', encoding='utf-8') as f:
            dot_text = f.read()

        if verbose:
            print(f'  [{filename}] 大小: {len(dot_text)} chars')

        write_xml(dot_text, str(xml_path))

        if verbose:
            print(f'  [{filename}] DOT 已保存: {xml_path.name}')

        parsed = parse_dot(dot_text)

        topology = build_topology_json(filename, parsed)

        write_json(topology, str(json_path))

        result['deviceCount'] = topology['meta']['deviceCount']
        result['linkCount'] = topology['meta']['linkCount']
        result['duration'] = round(time.time() - start_time, 2)

        if verbose:
            print(f'  [{filename}] JSON 已保存: 设备 {result["deviceCount"]} / 链路 {result["linkCount"]} / 用时 {result["duration"]}s')

    except Exception as e:
        error_code = type(e).__name__
        error_message = str(e)
        error_json = build_error_json(filename, error_code, error_message)
        write_json(error_json, str(json_path))

        result['status'] = 'error'
        result['error'] = error_message
        result['duration'] = round(time.time() - start_time, 2)

        if verbose:
            print(f'  [{filename}] 解析失败: {error_code}: {error_message}')

    return result


def main():
    parser = argparse.ArgumentParser(description='Graphviz DOT → JSON 预处理脚本')
    parser.add_argument('--force', action='store_true', help='强制全量重建')
    parser.add_argument('--verbose', '-v', action='store_true', help='详细输出')
    parser.add_argument('--file', type=str, help='仅处理指定文件（相对 raw/ 的路径）')
    args = parser.parse_args()

    print('=' * 60)
    print('Graphviz DOT → JSON 预处理脚本')
    print('=' * 60)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    XML_DIR.mkdir(parents=True, exist_ok=True)
    JSON_DIR.mkdir(parents=True, exist_ok=True)

    if args.file:
        dot_files = [RAW_DIR / args.file]
        if not dot_files[0].exists():
            print(f'文件不存在: {dot_files[0]}')
            sys.exit(1)
    else:
        dot_files = sorted(RAW_DIR.glob('*.dot'))

    if not dot_files:
        print(f'未找到 .dot 文件，请将文件放入 {RAW_DIR}')
        print('提示：目录已创建，可放入 .dot 文件后重新运行。')
        return

    to_process = []
    skipped = 0
    for dot_path in dot_files:
        stem = dot_path.stem
        json_path = JSON_DIR / f'{stem}.json'
        if needs_rebuild(dot_path, json_path, args.force):
            to_process.append(dot_path)
        else:
            skipped += 1

    print(f'发现 {len(dot_files)} 个 .dot 文件，需处理 {len(to_process)} 个，跳过 {skipped} 个')
    print('-' * 60)

    if not to_process:
        print('所有文件均为最新，无需处理。')
        return

    results = []
    for dot_path in to_process:
        if args.verbose:
            print(f'处理: {dot_path.name}')
        result = process_dot(dot_path, args.verbose)
        results.append(result)

    print('-' * 60)
    success = sum(1 for r in results if r['status'] == 'success')
    failed = sum(1 for r in results if r['status'] == 'error')
    total_devices = sum(r['deviceCount'] for r in results)
    total_links = sum(r['linkCount'] for r in results)
    total_time = sum(r['duration'] for r in results)

    print(f'处理完成: 成功 {success} / 失败 {failed}')
    print(f'设备总数: {total_devices} / 链路总数: {total_links}')
    print(f'总用时: {total_time}s')
    print(f'DOT 输出: {XML_DIR}')
    print(f'JSON 输出: {JSON_DIR}')

    if failed > 0:
        print('\n失败文件:')
        for r in results:
            if r['status'] == 'error':
                print(f'  {r["file"]}: {r["error"]}')

    if failed > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
