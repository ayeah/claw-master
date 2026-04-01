#!/usr/bin/env python3
"""
版本号管理工具

用法:
    python3 tools/version.py bump patch    # 补丁版本 +1 (0.4.0 → 0.4.1)
    python3 tools/version.py bump minor    # 小版本 +1 (0.4.0 → 0.5.0)
    python3 tools/version.py bump major    # 大版本 +1 (0.4.0 → 1.0.0)
    python3 tools/version.py show          # 显示当前版本
    python3 tools/version.py history       # 显示版本历史
"""

import sys
from pathlib import Path
from datetime import datetime

VERSION_FILE = Path(__file__).parent.parent / 'VERSION'


def read_version():
    """读取当前版本号"""
    if not VERSION_FILE.exists():
        return '0.1.0'
    
    content = VERSION_FILE.read_text()
    for line in content.split('\n'):
        if line.startswith('**当前版本：**'):
            return line.split('**当前版本：**')[1].strip()
    return '0.1.0'


def parse_version(version_str):
    """解析版本号"""
    parts = version_str.split('.')
    return {
        'major': int(parts[0]),
        'minor': int(parts[1]),
        'patch': int(parts[2])
    }


def format_version(major, minor, patch):
    """格式化版本号"""
    return f'{major}.{minor}.{patch}'


def bump_version(bump_type):
    """更新版本号"""
    current = read_version()
    v = parse_version(current)
    
    if bump_type == 'patch':
        v['patch'] += 1
    elif bump_type == 'minor':
        v['minor'] += 1
        v['patch'] = 0
    elif bump_type == 'major':
        v['major'] += 1
        v['minor'] = 0
        v['patch'] = 0
    else:
        print(f'❌ 错误：未知的版本类型 "{bump_type}"')
        print('可用类型：patch, minor, major')
        sys.exit(1)
    
    new_version = format_version(v['major'], v['minor'], v['patch'])
    
    # 更新 VERSION 文件
    content = VERSION_FILE.read_text()
    content = content.replace(
        f'**当前版本：** {current}',
        f'**当前版本：** {new_version}'
    )
    
    # 更新版本历史
    today = datetime.now().strftime('%Y-%m-%d')
    history_section = '## 📝 版本历史\n\n| 版本 | 日期 | 说明 |\n|------|------|------|\n'
    
    if history_section in content:
        # 添加新版本到历史
        new_line = f'| {new_version} | {today} | 待填写 |\n'
        content = content.replace(history_section, history_section + new_line)
    
    VERSION_FILE.write_text(content)
    
    print(f'✅ 版本号已更新：{current} → {new_version}')
    return new_version


def show_version():
    """显示当前版本"""
    version = read_version()
    print(f'当前版本：{version}')
    return version


def show_history():
    """显示版本历史"""
    if not VERSION_FILE.exists():
        print('❌ VERSION 文件不存在')
        return
    
    content = VERSION_FILE.read_text()
    in_history = False
    
    for line in content.split('\n'):
        if line.startswith('## 📝 版本历史'):
            in_history = True
        elif in_history and line.startswith('##'):
            break
        elif in_history:
            print(line)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'show':
        show_version()
    elif command == 'bump':
        if len(sys.argv) < 3:
            print('❌ 错误：请指定版本类型 (patch/minor/major)')
            sys.exit(1)
        bump_version(sys.argv[2])
    elif command == 'history':
        show_history()
    else:
        print(f'❌ 错误：未知命令 "{command}"')
        print(__doc__)
        sys.exit(1)


if __name__ == '__main__':
    main()
