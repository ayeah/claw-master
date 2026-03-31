#!/usr/bin/env python3
"""
OpenClaw Docker 部署脚本
将开发环境代码部署到宿主主机的 Docker 容器中

容器名称：claw-master-version
数据库：postgresql://user_xKQftk:password_yP7FCG@postgresql:5432
持久化存储：~/claw-master/
"""

import socket
import http.client
import json
import os
import sys
import argparse
from datetime import datetime


# ============================================================================
# 配置常量
# ============================================================================

DOCKER_SOCKET = '/var/run/docker.sock'
DEFAULT_CONTAINER_PREFIX = 'claw-master'
DEFAULT_IMAGE = '1panel/openclaw:latest'
DEFAULT_PORT = 18789
HOST_DATA_DIR = os.path.expanduser('~/claw-master')


def get_container_name(prefix, version=None):
    """生成容器名称"""
    if version:
        return f"{prefix}-{version}"
    return f"{prefix}-latest"

# 数据库配置
DB_CONNECTION_STRING = 'postgresql://user_xKQftk:password_yP7FCG@postgresql:5432'
DB_CONFIG = {
    'host': 'postgresql',
    'port': '5432',
    'user': 'user_xKQftk',
    'password': 'password_yP7FCG',
    'name': ''
}


# ============================================================================
# 颜色输出
# ============================================================================

class Colors:
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    NC = '\033[0m'  # No Color


def log_info(msg):
    print(f"{Colors.BLUE}[INFO]{Colors.NC} {msg}")


def log_success(msg):
    print(f"{Colors.GREEN}[SUCCESS]{Colors.NC} {msg}")


def log_warning(msg):
    print(f"{Colors.YELLOW}[WARNING]{Colors.NC} {msg}")


def log_error(msg):
    print(f"{Colors.RED}[ERROR]{Colors.NC} {msg}")


# ============================================================================
# Docker API 封装
# ============================================================================

class DockerClient:
    def __init__(self, socket_path=DOCKER_SOCKET, timeout=60):
        self.socket_path = socket_path
        self.timeout = timeout
    
    def _connect(self):
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.connect(self.socket_path)
        conn = http.client.HTTPConnection('', timeout=self.timeout)
        conn.sock = sock
        return conn
    
    def request(self, method, endpoint, body=None, headers=None, timeout=None):
        conn = self._connect()
        if timeout:
            conn.timeout = timeout
        
        req_headers = headers or {}
        if body:
            req_headers['Content-Type'] = 'application/json'
            body = json.dumps(body) if isinstance(body, dict) else body
        
        conn.request(method, endpoint, body=body, headers=req_headers)
        resp = conn.getresponse()
        
        result = {
            'status': resp.status,
            'headers': dict(resp.getheaders()),
            'body': resp.read().decode('utf-8')
        }
        
        conn.close()
        return result
    
    def get_json(self, endpoint):
        result = self.request('GET', endpoint)
        if result['body']:
            return json.loads(result['body']), result['status']
        return {}, result['status']
    
    def post_json(self, endpoint, body=None):
        result = self.request('POST', endpoint, body=body)
        if result['body']:
            return json.loads(result['body']), result['status']
        return {}, result['status']
    
    def delete(self, endpoint):
        return self.request('DELETE', endpoint)
    
    def check_connection(self):
        try:
            result = self.get_json('/version')
            return result[1] == 200
        except Exception as e:
            print(f"Connection check failed: {e}")
            return False


# ============================================================================
# 部署功能
# ============================================================================

def create_host_directories(base_dir):
    """创建持久化存储目录"""
    subdirs = ['data', 'logs', 'config', 'backups']
    
    log_info(f"创建持久化存储目录：{base_dir}")
    
    for subdir in subdirs:
        path = os.path.join(base_dir, subdir)
        os.makedirs(path, exist_ok=True)
    
    log_success(f"目录创建完成：{base_dir}/{{{','.join(subdirs)}}}")


def get_container_info(client, container_name):
    """获取容器信息"""
    # 先获取所有容器列表
    containers, status = client.get_json('/containers/json?all=true')
    
    for container in containers:
        names = container.get('Names', [])
        name = container.get('Name', '').lstrip('/')
        
        if not name and names:
            name = names[0].lstrip('/')
        
        if name == container_name:
            return {
                'id': container.get('Id', '')[:12],
                'name': name,
                'state': container.get('State', {}).get('Status', 'unknown'),
                'running': container.get('State', {}).get('Running', False),
                'full_container': container
            }
    
    return None


def stop_container(client, container_name, timeout=30):
    """停止容器"""
    log_info(f"停止容器：{container_name}")
    
    result = client.request('POST', f'/containers/{container_name}/stop?t={timeout}')
    
    if result['status'] in [200, 204, 304]:
        log_success("容器已停止")
        return True
    else:
        log_warning(f"停止容器响应：{result['status']}")
        return False


def remove_container(client, container_name):
    """删除容器"""
    log_info(f"删除容器：{container_name}")
    
    result = client.delete(f'/containers/{container_name}')
    
    if result['status'] in [200, 204]:
        log_success("容器已删除")
        return True
    else:
        log_error(f"删除容器失败：{result['status']}")
        return False


def pull_image(client, image_name):
    """拉取镜像"""
    log_info(f"拉取 Docker 镜像：{image_name}")
    
    # 处理镜像名称
    image_for_url = image_name.replace(':', '%3A').replace('/', '%2F')
    
    result = client.request('POST', f'/images/create?fromImage={image_for_url}', timeout=300)
    
    # 解析进度输出
    if result['body']:
        for line in result['body'].strip().split('\n'):
            if line:
                try:
                    data = json.loads(line)
                    status = data.get('status', '')
                    if 'progressDetail' in data:
                        detail = data['progressDetail']
                        if 'current' in detail and 'total' in detail:
                            percent = (detail['current'] / detail['total']) * 100 if detail['total'] > 0 else 100
                            print(f"\r  下载进度：{status} - {percent:.1f}%", end='', flush=True)
                        else:
                            print(f"\r  状态：{status}", end='', flush=True)
                    else:
                        print(f"\r  状态：{status}", end='', flush=True)
                except:
                    pass
        print()
    
    log_success("镜像拉取完成")
    return True


def create_and_start_container(client, container_name, image_name, port, env_vars, volumes):
    """创建并启动容器"""
    log_info("创建并启动容器...")
    
    # 构建容器配置
    config = {
        "name": container_name,
        "Image": image_name,
        "Env": env_vars,
        "HostConfig": {
            "Binds": volumes,
            "PortBindings": {
                "18789/tcp": [
                    {
                        "HostIp": "0.0.0.0",
                        "HostPort": str(port)
                    }
                ]
            },
            "RestartPolicy": {
                "Name": "on-failure",
                "MaximumRetryCount": 3
            },
            "LogConfig": {
                "Type": "json-file",
                "Config": {
                    "max-size": "10m",
                    "max-file": "3"
                }
            }
        },
        "WorkingDir": "/app",
        "Tty": False,
        "OpenStdin": False
    }
    
    # 创建容器
    result, status = client.post_json('/containers/create', config)
    
    if status != 201:
        log_error(f"创建容器失败：{result}")
        return None
    
    container_id = result.get('Id', '')
    log_success(f"容器创建成功：{container_id[:12]}")
    
    # 启动容器
    result = client.request('POST', f'/containers/{container_id}/start')
    
    if result['status'] in [200, 204]:
        log_success("容器启动成功")
        return container_id[:12]
    else:
        log_error(f"启动容器失败：{result['status']}")
        return None


def verify_container(client, container_name, timeout=10):
    """验证容器状态"""
    log_info("验证容器状态...")
    
    import time
    time.sleep(3)  # 等待容器启动
    
    container_info = get_container_info(client, container_name)
    
    if container_info:
        status = container_info['state']
        if status == 'running':
            log_success(f"容器运行正常 (状态：{status})")
            return True
        else:
            log_warning(f"容器状态异常：{status}")
            return False
    else:
        log_error("无法获取容器状态")
        return False


def load_extra_env(env_file):
    """加载额外环境变量文件"""
    env_vars = []
    
    if not env_file:
        return env_vars
    
    if not os.path.exists(env_file):
        log_warning(f"环境变量文件不存在：{env_file}")
        return env_vars
    
    try:
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    env_vars.append(line)
        log_success(f"已加载额外环境变量：{env_file}")
    except Exception as e:
        log_warning(f"无法加载环境变量文件：{e}")
    
    return env_vars


# ============================================================================
# 主部署流程
# ============================================================================

def deploy(args):
    """执行部署"""
    
    # 生成容器名称
    container_name = get_container_name(DEFAULT_CONTAINER_PREFIX, args.version)
    
    print()
    print("=" * 79)
    print("  🚀 OpenClaw 部署脚本")
    print("=" * 79)
    print()
    print(f"  容器名称：{container_name}")
    print(f"  镜像：    {args.image}")
    print(f"  版本：    {args.version or 'latest'}")
    print()
    
    # 初始化 Docker 客户端
    client = DockerClient()
    
    # 1. 检查 Docker 连接
    log_info("检查 Docker 连接...")
    if not client.check_connection():
        log_error("无法连接到 Docker daemon")
        sys.exit(1)
    log_success("Docker 连接正常")
    
    # 2. 创建持久化目录
    create_host_directories(HOST_DATA_DIR)
    
    # 3. 检查并处理现有容器
    log_info("检查现有容器...")
    container_info = get_container_info(client, container_name)
    
    if container_info:
        log_warning(f"发现现有容器：{container_name} (状态：{container_info['state']})")
        
        if args.rebuild:
            log_info("强制重建模式：删除现有容器...")
            stop_container(client, container_name)
            remove_container(client, container_name)
        else:
            log_info("停止现有容器...")
            stop_container(client, container_name)
    else:
        log_info("未发现现有容器")
    
    # 4. 拉取镜像
    if not args.skip_pull:
        pull_image(client, args.image)
    
    # 5. 准备环境变量
    base_env_vars = [
        f"DATABASE_URL={DB_CONNECTION_STRING}",
        f"DB_HOST={DB_CONFIG['host']}",
        f"DB_PORT={DB_CONFIG['port']}",
        f"DB_USER={DB_CONFIG['user']}",
        f"DB_PASSWORD={DB_CONFIG['password']}",
        f"DB_NAME={DB_CONFIG['name']}",
        "TZ=Asia/Shanghai"
    ]
    
    # 加载额外环境变量
    extra_env_vars = load_extra_env(args.env)
    base_env_vars.extend(extra_env_vars)
    
    # 6. 准备卷挂载
    volumes = [
        f"{HOST_DATA_DIR}/data:/app/data",
        f"{HOST_DATA_DIR}/logs:/app/logs",
        f"{HOST_DATA_DIR}/config:/app/config",
        f"{HOST_DATA_DIR}/backups:/app/backups"
    ]
    
    # 7. 创建并启动容器
    container_id = create_and_start_container(
        client, 
        container_name, 
        args.image, 
        args.port,
        base_env_vars,
        volumes
    )
    
    if not container_id:
        log_error("容器创建或启动失败")
        sys.exit(1)
    
    # 8. 验证容器状态
    if not verify_container(client, container_name):
        log_warning("容器状态验证失败，请检查日志")
    
    # 9. 显示部署信息
    print()
    print("=" * 79)
    print("  ✅ 部署完成!")
    print("=" * 79)
    print()
    print(f"  容器名称：    {container_name}")
    print(f"  镜像：        {args.image}")
    print(f"  访问端口：    {args.port}")
    print(f"  数据库：      {DB_CONNECTION_STRING}")
    print(f"  数据目录：    {HOST_DATA_DIR}")
    print()
    print("  子目录结构:")
    print(f"    - {HOST_DATA_DIR}/data     (应用数据)")
    print(f"    - {HOST_DATA_DIR}/logs     (日志文件)")
    print(f"    - {HOST_DATA_DIR}/config   (配置文件)")
    print(f"    - {HOST_DATA_DIR}/backups  (备份文件)")
    print()
    print("  常用命令:")
    print(f"    查看日志：     docker logs -f {container_name}")
    print(f"    进入容器：     docker exec -it {container_name} bash")
    print(f"    重启容器：     docker restart {container_name}")
    print(f"    停止容器：     docker stop {container_name}")
    print(f"    删除容器：     docker rm -f {container_name}")
    print()
    print("=" * 79)
    print()


def main():
    parser = argparse.ArgumentParser(
        description='OpenClaw Docker 部署脚本',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s                          # 使用默认配置部署
  %(prog)s -i myimage:latest        # 指定镜像
  %(prog)s -p 8080                  # 指定端口
  %(prog)s -r                       # 强制重建容器
  %(prog)s -i myimage:latest -p 8080 -r  # 组合选项
  %(prog)s -e .env.extra            # 加载额外环境变量
        """
    )
    
    parser.add_argument(
        '-i', '--image',
        default=DEFAULT_IMAGE,
        help=f'Docker 镜像名称 (默认：{DEFAULT_IMAGE})'
    )
    
    parser.add_argument(
        '-v', '--version',
        metavar='VER',
        help='版本号（用于生成容器名称，如：v1.0.0、2026.3.28）'
    )
    
    parser.add_argument(
        '-p', '--port',
        type=int,
        default=DEFAULT_PORT,
        help=f'容器暴露端口 (默认：{DEFAULT_PORT})'
    )
    
    parser.add_argument(
        '-e', '--env',
        metavar='FILE',
        help='额外环境变量文件路径'
    )
    
    parser.add_argument(
        '-r', '--rebuild',
        action='store_true',
        help='强制重建容器（删除现有容器）'
    )
    
    parser.add_argument(
        '--skip-pull',
        action='store_true',
        help='跳过镜像拉取（使用本地镜像）'
    )
    
    args = parser.parse_args()
    
    try:
        deploy(args)
    except KeyboardInterrupt:
        print("\n部署已取消")
        sys.exit(130)
    except Exception as e:
        log_error(f"部署失败：{e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
