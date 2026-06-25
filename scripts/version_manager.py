#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Claw Master 版本管理工具
用法:
    python version_manager.py build    # 构建版本 (更新计数器)
    python version_manager.py feature  # 新功能版本 (Minor+1)
    python version_manager.py major    # 架构变动版本 (Major+1)
    python version_manager.py current  # 显示当前版本
    python version_manager.py sync     # 同步版本到子项目
"""

import sys
import re
import json
import configparser
from pathlib import Path
from datetime import datetime
from typing import Tuple, Optional
import io

# 设置标准输出编码为 UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

ROOT_DIR = Path(__file__).parent.parent
VERSION_FILE = ROOT_DIR / 'VERSION'
CONFIG_FILE = ROOT_DIR / 'VERSION_CONFIG.toml'

class VersionManager:
    def __init__(self):
        self.config = self._load_config()
        self.current_version = self._read_version()
        
    def _load_config(self) -> dict:
        """加载版本配置"""
        config = {
            'version': {'suffix_base': 26},
            'rules': {
                'build_increment': 'suffix',
                'feature_increment': 'minor',
                'major_increment': 'major',
                'minor_threshold': 100
            },
            'build': {
                'clean_old_builds': True,
                'output_dir': 'dist',
                'keep_patterns': ['win-unpacked', '*.exe', '*.dmg', '*.AppImage']
            }
        }
        
        if CONFIG_FILE.exists():
            parser = configparser.ConfigParser()
            parser.read(CONFIG_FILE, encoding='utf-8')
            
            if 'version' in parser:
                config['version']['suffix_base'] = parser.getint('version', 'suffix_base', fallback=26)
            
            if 'rules' in parser:
                config['rules']['minor_threshold'] = parser.getint('rules', 'minor_threshold', fallback=100)
            
            if 'build' in parser:
                config['build']['clean_old_builds'] = parser.getboolean('build', 'clean_old_builds', fallback=True)
                config['build']['output_dir'] = parser.get('build', 'output_dir', fallback='dist')
                keep = parser.get('build', 'keep_patterns', fallback='win-unpacked,*.exe,*.dmg,*.AppImage')
                config['build']['keep_patterns'] = [p.strip() for p in keep.split(',')]
        
        return config
    
    def _read_version(self) -> Tuple[str, int, int, int, str]:
        """读取并解析版本号
        返回: (prefix, major, minor, patch, suffix)
        """
        if not VERSION_FILE.exists():
            return ('v', 1, 0, 0, 'a')
        
        content = VERSION_FILE.read_text(encoding='utf-8').strip()
        # 匹配: v1.0.0(Build 20260618a)
        match = re.match(r'v(\d+)\.(\d+)\.(\d+)\(Build (\d+)([a-z]+)\)', content)
        if not match:
            return ('v', 1, 0, 0, 'a')
        
        major, minor, patch = int(match.group(1)), int(match.group(2)), int(match.group(3))
        suffix = match.group(5)
        return ('v', major, minor, patch, suffix)
    
    def _suffix_to_number(self, suffix: str) -> int:
        """将后缀转换为数字: a=1, b=2, ..., z=26, aa=27"""
        base = self.config['version']['suffix_base']
        result = 0
        for char in suffix:
            result = result * base + (ord(char) - ord('a') + 1)
        return result
    
    def _number_to_suffix(self, num: int) -> str:
        """将数字转换为后缀: 1=a, 2=b, ..., 26=z, 27=aa"""
        base = self.config['version']['suffix_base']
        result = []
        while num > 0:
            num, remainder = divmod(num - 1, base)
            result.append(chr(remainder + ord('a')))
        return ''.join(reversed(result))
    
    def _format_version(self, major: int, minor: int, patch: int, suffix: str) -> str:
        """格式化版本号"""
        today = datetime.now().strftime("%Y%m%d")
        return f"v{major}.{minor}.{patch}(Build {today}{suffix})"
    
    def _parse_version(self, version_str: str) -> Tuple[int, int, int, str]:
        """解析版本字符串"""
        match = re.match(r'v(\d+)\.(\d+)\.(\d+)\(Build (\d+)([a-z]+)\)', version_str)
        if not match:
            return (1, 0, 0, 'a')
        return (
            int(match.group(1)),
            int(match.group(2)),
            int(match.group(3)),
            match.group(5)
        )
    
    def increment_build(self) -> str:
        """构建版本: 递增后缀"""
        major, minor, patch, suffix = self.current_version[1:]
        suffix_num = self._suffix_to_number(suffix) + 1
        new_suffix = self._number_to_suffix(suffix_num)
        return self._format_version(major, minor, patch, new_suffix)
    
    def increment_feature(self) -> str:
        """新功能版本: Minor+1, Patch=0, Suffix=a"""
        major, minor, patch, _ = self.current_version[1:]
        minor += 1
        patch = 0
        
        # 检查是否需要升级 Major
        threshold = self.config['rules']['minor_threshold']
        if minor >= threshold:
            major += 1
            minor = 0
            patch = 0
        
        return self._format_version(major, minor, patch, 'a')
    
    def increment_major(self) -> str:
        """架构变动版本: Major+1, Minor=0, Patch=0"""
        major, _, _, _ = self.current_version[1:]
        major += 1
        return self._format_version(major, 0, 0, 'a')
    
    def get_version_tuple(self, version_str: str) -> Tuple[int, int, int, str]:
        """从版本字符串提取元组"""
        return self._parse_version(version_str)
    
    def show_current(self):
        """显示当前版本"""
        version_str = VERSION_FILE.read_text(encoding='utf-8').strip() if VERSION_FILE.exists() else "未设置"
        print(f"当前版本: {version_str}")
        
        major, minor, patch, suffix = self.current_version[1:]
        suffix_num = self._suffix_to_number(suffix)
        print(f"  Major: {major}")
        print(f"  Minor: {minor}")
        print(f"  Patch: {patch}")
        print(f"  Suffix: {suffix} ({suffix_num})")
    
    def sync_to_projects(self, version_str: str):
        """同步版本号到子项目"""
        major, minor, patch, _ = self._parse_version(version_str)
        semver = f"{major}.{minor}.{patch}"
        
        # 更新 client/package.json
        client_pkg = ROOT_DIR / 'claw-master-client' / 'package.json'
        if client_pkg.exists():
            pkg = json.loads(client_pkg.read_text(encoding='utf-8'))
            pkg['version'] = semver
            client_pkg.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
            print(f"  ✓ client/package.json -> {semver}")
        
        # 更新 server/pyproject.toml
        server_py = ROOT_DIR / 'claw-master-server' / 'pyproject.toml'
        if server_py.exists():
            content = server_py.read_text(encoding='utf-8')
            content = re.sub(r'version = "[^"]*"', f'version = "{semver}"', content)
            server_py.write_text(content, encoding='utf-8')
            print(f"  ✓ server/pyproject.toml -> {semver}")
    
    def clean_dist(self):
        """清理 dist 目录，只保留最新构建"""
        dist_dir = ROOT_DIR / 'claw-master-client' / 'dist'
        if not dist_dir.exists():
            return
        
        keep = self.config['build']['keep_patterns']
        for item in dist_dir.iterdir():
            if item.is_dir():
                # 检查目录是否在保留列表中
                if item.name not in keep:
                    try:
                        import shutil
                        shutil.rmtree(item, ignore_errors=True)
                        print(f"  🗑 删除目录: {item.name}")
                    except Exception as e:
                        print(f"  ⚠️ 无法删除目录 {item.name}: {e}")
            elif item.is_file():
                # 检查文件是否匹配保留模式
                if not any(item.match(pattern) for pattern in keep):
                    try:
                        item.unlink(missing_ok=True)
                        print(f"  🗑 删除文件: {item.name}")
                    except Exception as e:
                        print(f"  ⚠️ 无法删除文件 {item.name}: {e}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    action = sys.argv[1].lower()
    manager = VersionManager()
    
    if action == 'current':
        manager.show_current()
    
    elif action == 'build':
        new_version = manager.increment_build()
        VERSION_FILE.write_text(new_version)
        print(f"✅ 构建版本已更新: {new_version}")
        manager.sync_to_projects(new_version)
        manager.clean_dist()
    
    elif action == 'feature':
        new_version = manager.increment_feature()
        VERSION_FILE.write_text(new_version)
        print(f"✅ 功能版本已更新: {new_version}")
        manager.sync_to_projects(new_version)
        manager.clean_dist()
    
    elif action == 'major':
        new_version = manager.increment_major()
        VERSION_FILE.write_text(new_version)
        print(f"✅ 主版本已更新: {new_version}")
        manager.sync_to_projects(new_version)
        manager.clean_dist()
    
    else:
        print(f"未知操作: {action}")
        print(__doc__)
        sys.exit(1)


if __name__ == '__main__':
    main()