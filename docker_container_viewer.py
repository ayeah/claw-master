#!/usr/bin/env python3
"""
Docker 容器查看脚本
使用 Python 标准库直接调用 Docker API（无需安装 docker 库）
"""

import json
import socket
import http.client
import sys
import argparse
from datetime import datetime


DOCKER_SOCKET = '/var/run/docker.sock'


def format_bytes(size):
    """格式化字节大小为人类可读格式"""
    if not size or size == 0:
        return '-'
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} PB"


def format_uptime(seconds):
    """格式化运行时间为人类可读格式"""
    if not seconds or seconds <= 0:
        return "N/A"
    
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    
    parts = []
    if days > 0:
        parts.append(f"{days}天")
    if hours > 0:
        parts.append(f"{hours}小时")
    if minutes > 0:
        parts.append(f"{minutes}分钟")
    
    return " ".join(parts) if parts else "刚刚"


def docker_request(endpoint, method='GET', body=None):
    """发送请求到 Docker API"""
    try:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.connect(DOCKER_SOCKET)
        
        conn = http.client.HTTPConnection('', timeout=10)
        conn.sock = sock
        
        headers = {'Content-Type': 'application/json'} if body else {}
        conn.request(method, endpoint, body=body, headers=headers)
        
        response = conn.getresponse()
        data = response.read().decode('utf-8')
        
        conn.close()
        sock.close()
        
        if response.status != 200:
            raise Exception(f"Docker API 错误 {response.status}: {data}")
        
        return json.loads(data) if data else None
    
    except PermissionError as e:
        raise Exception(f"权限错误：无法访问 Docker socket ({DOCKER_SOCKET})\n"
                       f"请确保当前用户有权限读取该文件，或将其添加到 docker 组")
    except FileNotFoundError:
        raise Exception(f"Docker socket 不存在：{DOCKER_SOCKET}\n"
                       f"请确保 Docker 服务正在运行")
    except Exception as e:
        raise Exception(f"连接 Docker 失败：{str(e)}")


def get_container_info(container):
    """获取容器详细信息"""
    try:
        # 如果是容器 ID 字符串，需要获取完整详情
        if isinstance(container, str):
            container = docker_request(f'/containers/{container}/json')
        
        attrs = container
        
        # 获取状态
        state = attrs.get('State', {})
        if not isinstance(state, dict):
            state = {}
        status = state.get('Status', 'unknown')
        running = state.get('Running', False)
        started_at = state.get('StartedAt', '')
        
        # 计算运行时间
        uptime = "N/A"
        if running and started_at:
            try:
                # 解析 ISO 8601 时间格式
                start_str = started_at.replace('Z', '+00:00')
                if '.' in start_str:
                    start_str = start_str.split('.')[0] + start_str[19:]
                start_time = datetime.fromisoformat(start_str)
                now = datetime.now(start_time.tzinfo) if start_time.tzinfo else datetime.now()
                uptime_seconds = (now - start_time).total_seconds()
                uptime = format_uptime(uptime_seconds)
            except Exception:
                uptime = "N/A"
        
        # 获取镜像信息
        image = attrs.get('Config', {}).get('Image', 'unknown')
        
        # 获取端口映射
        ports = []
        network_settings = attrs.get('NetworkSettings', {})
        port_mapping = network_settings.get('Ports', {})
        if port_mapping:
            for host_port, container_ports in port_mapping.items():
                if container_ports:
                    for mapping in container_ports:
                        host_ip = mapping.get('HostIp', '0.0.0.0')
                        host_port_num = mapping.get('HostPort', '')
                        if host_port_num:
                            ports.append(f"{host_ip}:{host_port_num}->{host_port}")
        
        # 获取资源使用
        size_rw = attrs.get('SizeRw', 0)
        size_root_fs = attrs.get('SizeRootFs', 0)
        
        # 获取容器名称（完整详情 API 返回 Name，列表 API 返回 Names）
        name = 'unknown'
        if container.get('Name'):
            name = container.get('Name').lstrip('/')
        elif container.get('Names'):
            names = container.get('Names')
            if isinstance(names, list) and len(names) > 0:
                name = names[0].lstrip('/')
            elif isinstance(names, str):
                name = names.lstrip('/')
        
        return {
            'id': container.get('Id', '')[:12],
            'name': name,
            'image': image,
            'status': status,
            'running': running,
            'uptime': uptime,
            'ports': ', '.join(ports) if ports else '-',
            'size_rw': format_bytes(size_rw) if size_rw else '-',
            'size_root_fs': format_bytes(size_root_fs) if size_root_fs else '-',
            'created': container.get('Created', 'unknown')[:19].replace('T', ' '),
        }
    except Exception as e:
        return {
            'id': container.get('Id', 'unknown')[:12],
            'name': container.get('Names', ['unknown'])[0].lstrip('/') if container.get('Names') else 'unknown',
            'image': 'error',
            'status': f'error: {str(e)}',
            'running': False,
            'uptime': 'N/A',
            'ports': '-',
            'size_rw': '-',
            'size_root_fs': '-',
            'created': 'unknown',
        }


def list_containers(all_containers=False, filters=None):
    """列出容器"""
    try:
        # 构建 API 端点
        endpoint = '/containers/json?all=true' if all_containers else '/containers/json'
        
        if filters:
            filters_json = json.dumps(filters)
            import urllib.parse
            endpoint = f'/containers/json?all={str(all_containers).lower()}&filters={urllib.parse.quote(filters_json)}'
        
        containers_summary = docker_request(endpoint)
        
        if not containers_summary:
            print("没有找到容器")
            return []
        
        print(f"\n{'='*100}")
        print(f"找到 {len(containers_summary)} 个容器")
        print(f"{'='*100}\n")
        
        container_list = []
        for container_summary in containers_summary:
            # 获取容器完整详情
            container_id = container_summary.get('Id', '')
            container = docker_request(f'/containers/{container_id}/json')
            info = get_container_info(container)
            container_list.append(info)
            
            # 打印容器信息
            status_icon = "🟢" if info['running'] else "🔴"
            print(f"{status_icon} {info['name']}")
            print(f"   ID:      {info['id']}")
            print(f"   镜像：    {info['image']}")
            print(f"   状态：    {info['status']} ({info['uptime']})")
            print(f"   端口：    {info['ports']}")
            print(f"   存储：    RW: {info['size_rw']} | RootFS: {info['size_root_fs']}")
            print(f"   创建：    {info['created']}")
            print()
        
        return container_list
    
    except Exception as e:
        print(f"❌ 错误：{str(e)}")
        print("\n可能的原因:")
        print("  1. Docker 服务未运行")
        print("  2. 当前用户没有 Docker 访问权限")
        print("  3. Docker socket 路径不正确")
        return []


def get_docker_info():
    """获取 Docker 系统信息"""
    try:
        info = docker_request('/info')
        print(f"\n{'='*100}")
        print("Docker 系统信息")
        print(f"{'='*100}")
        print(f"  Docker 版本：   {info.get('ServerVersion', 'unknown')}")
        print(f"  运行容器数：    {info.get('ContainersRunning', 0)}")
        print(f"  暂停容器数：    {info.get('ContainersPaused', 0)}")
        print(f"  停止容器数：    {info.get('ContainersStopped', 0)}")
        print(f"  镜像总数：      {info.get('Images', 0)}")
        print(f"  存储驱动：      {info.get('Driver', 'unknown')}")
        print(f"  操作系统：      {info.get('OperatingSystem', 'unknown')}")
        print(f"  内核版本：      {info.get('KernelVersion', 'unknown')}")
        print(f"  架构：          {info.get('Architecture', 'unknown')}")
        print(f"  日志驱动：      {info.get('LoggingDriver', 'unknown')}")
        print()
        return info
    except Exception as e:
        print(f"❌ 获取 Docker 信息失败：{str(e)}\n")
        return None


def get_containers_stats():
    """获取容器统计信息"""
    try:
        containers_summary = docker_request('/containers/json?all=true')
        if not containers_summary:
            return
        
        running = sum(1 for c in containers_summary if c.get('State', {}).get('Running', False))
        stopped = len(containers_summary) - running
        
        print(f"\n{'='*100}")
        print("容器统计")
        print(f"{'='*100}")
        print(f"  总容器数：    {len(containers_summary)}")
        print(f"  运行中：      {running}")
        print(f"  已停止：      {stopped}")
        print()
    except Exception as e:
        print(f"获取统计信息失败：{str(e)}\n")


def export_to_json(data, filename='containers.json'):
    """导出数据到 JSON 文件"""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ 已导出到 {filename}")
    except Exception as e:
        print(f"❌ 导出失败：{str(e)}")


def main():
    parser = argparse.ArgumentParser(description='Docker 容器查看工具')
    parser.add_argument('-a', '--all', action='store_true', help='显示所有容器（包括已停止的）')
    parser.add_argument('-f', '--filter', type=str, help='过滤器 (例如：status=running)')
    parser.add_argument('-j', '--json', action='store_true', help='以 JSON 格式输出')
    parser.add_argument('-o', '--output', type=str, help='输出文件路径')
    parser.add_argument('--info', action='store_true', help='显示 Docker 系统信息')
    parser.add_argument('--stats', action='store_true', help='显示容器统计')
    
    args = parser.parse_args()
    
    # 测试连接
    try:
        print(f"正在连接 Docker socket: {DOCKER_SOCKET}...")
        docker_request('/version')
        print("✅ 成功连接到 Docker daemon\n")
    except Exception as e:
        print(f"❌ 无法连接到 Docker daemon: {str(e)}")
        sys.exit(1)
    
    # 显示 Docker 系统信息
    if args.info:
        get_docker_info()
    
    # 显示统计
    if args.stats:
        get_containers_stats()
    
    # 解析过滤器
    filters = None
    if args.filter:
        if '=' in args.filter:
            key, value = args.filter.split('=', 1)
            filters = {key.strip(): value.strip()}
    
    # 列出容器
    containers = list_containers(all_containers=args.all, filters=filters)
    
    # 导出到 JSON
    if args.json or args.output:
        if args.output:
            export_to_json(containers, args.output)
        else:
            print("\nJSON 输出:")
            print(json.dumps(containers, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
