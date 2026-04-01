#!/usr/bin/env python3
"""
claw-master Docker 部署脚本

功能：
1. 从 VERSION 文件读取当前版本号
2. 部署 claw-master-<VERSION> 容器
3. 使用外部数据库连接
4. 支持端口和宿主机 IP 配置

使用方式:
  python3 tools/deploy-docker.py                    # 部署当前版本
  python3 tools/deploy-docker.py --port 38080       # 指定端口
  python3 tools/deploy-docker.py --rebuild          # 强制重建
  python3 tools/deploy-docker.py --skip-pull        # 跳过镜像拉取
"""

import socket
import http.client
import json
import os
import sys
import argparse
from pathlib import Path
from datetime import datetime


# ============================================================================
# 配置常量
# ============================================================================

DOCKER_SOCKET = '/var/run/docker.sock'
DEFAULT_PORT = 38080
HOST_IP = '10.10.1.100'
DEFAULT_IMAGE = 'claw-master:latest'

# 数据库配置
DB_CONNECTION_STRING = 'postgresql://user_xKQftk:password_yP7FCG@postgresql:5432/claw-master'
DB_CONFIG = {
    'host': 'postgresql',
    'port': '5432',
    'user': 'user_xKQftk',
    'password': 'password_yP7FCG',
    'name': 'claw-master'
}

# 工作区路径
SCRIPT_DIR = Path(__file__).parent
WORKSPACE_DIR = SCRIPT_DIR.parent
VERSION_FILE = WORKSPACE_DIR / 'VERSION'
HOST_DATA_DIR = Path.home() / 'claw-master'


# ============================================================================
# 版本号管理
# ============================================================================

def read_version():
    """从 VERSION 文件读取当前版本号"""
    if not VERSION_FILE.exists():
        return '0.0.0'
    
    content = VERSION_FILE.read_text()
    for line in content.split('\n'):
        if line.startswith('**当前版本：**'):
            return line.split('**当前版本：**')[1].strip()
    
    return '0.0.0'


def generate_container_name(version):
    """生成容器名称：claw-master-<VERSION>"""
    clean_version = version.replace(' ', '').replace('*', '')
    return f"claw-master-{clean_version}"


def generate_image_name(version):
    """生成镜像名称：claw-master:<VERSION>"""
    clean_version = version.replace(' ', '').replace('*', '')
    return f"claw-master:{clean_version}"


# ============================================================================
# 颜色输出
# ============================================================================

class Colors:
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    NC = '\033[0m'


def log_info(msg):
    print(f"{Colors.BLUE}[INFO]{Colors.NC} {msg}")


def log_success(msg):
    print(f"{Colors.GREEN}[✓]{Colors.NC} {msg}")


def log_warning(msg):
    print(f"{Colors.YELLOW}[!]{Colors.NC} {msg}")


def log_error(msg):
    print(f"{Colors.RED}[✗]{Colors.NC} {msg}")


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
            log_error(f"Docker 连接检查失败：{e}")
            return False


# ============================================================================
# 部署功能
# ============================================================================

def create_host_directories(base_dir):
    """创建持久化存储目录"""
    subdirs = ['data', 'logs', 'config', 'backups']
    
    log_info(f"创建持久化存储目录：{base_dir}")
    
    for subdir in subdirs:
        path = base_dir / subdir
        path.mkdir(parents=True, exist_ok=True)
    
    log_success(f"目录创建完成：{base_dir}/{{{','.join(subdirs)}}}")


def get_container_info(client, container_name):
    """获取容器信息"""
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
    
    image_for_url = image_name.replace(':', '%3A').replace('/', '%2F')
    
    result = client.request('POST', f'/images/create?fromImage={image_for_url}', timeout=300)
    
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
    
    config = {
        "name": container_name,
        "Image": image_name,
        "Env": env_vars,
        "HostConfig": {
            "Binds": volumes,
            "PortBindings": {
                "80/tcp": [
                    {
                        "HostIp": "0.0.0.0",
                        "HostPort": str(port)
                    }
                ]
            },
            "RestartPolicy": {
                "Name": "unless-stopped",
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
    
    result, status = client.post_json('/containers/create', config)
    
    if status != 201:
        log_error(f"创建容器失败：{result}")
        return None
    
    container_id = result.get('Id', '')[:12]
    log_success(f"容器创建成功：{container_id[:12]}")
    
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
    time.sleep(3)
    
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
    
    env_path = Path(env_file)
    if not env_path.exists():
        log_warning(f"环境变量文件不存在：{env_file}")
        return env_vars
    
    try:
        with open(env_path, 'r', encoding='utf-8') as f:
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
    
    # 读取版本号
    version = read_version()
    
    # 生成容器和镜像名称
    container_name = generate_container_name(version)
    image_name = args.image or generate_image_name(version)
    
    print()
    print("=" * 79)
    print("  🚀 claw-master 部署脚本")
    print("=" * 79)
    print()
    print(f"  版本号：    {version}")
    print(f"  容器名称：  {container_name}")
    print(f"  镜像：      {image_name}")
    print(f"  宿主机 IP:  {HOST_IP}")
    print(f"  访问端口：  {args.port}")
    print(f"  访问地址：  http://{HOST_IP}:{args.port}")
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
        pull_image(client, image_name)
    
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
        image_name, 
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
    print(f"  版本号：    {version}")
    print(f"  容器名称：  {container_name}")
    print(f"  镜像：      {image_name}")
    print(f"  访问地址：  http://{HOST_IP}:{args.port}")
    print(f"  登录账号：  admin / Admin@123")
    print(f"  数据库：    {DB_CONNECTION_STRING}")
    print(f"  数据目录：  {HOST_DATA_DIR}")
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
        description='claw-master Docker 部署脚本',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s                          # 使用当前版本部署
  %(prog)s -i claw-master:0.4.0     # 指定镜像版本
  %(prog)s -p 38080                 # 指定端口
  %(prog)s -r                       # 强制重建容器
  %(prog)s -i claw-master:0.4.0 -p 38080 -r  # 组合选项
  %(prog)s -e .env.extra            # 加载额外环境变量
  %(prog)s --skip-pull              # 跳过镜像拉取（使用本地镜像）
        """
    )
    
    parser.add_argument(
        '-i', '--image',
        metavar='IMAGE',
        help='Docker 镜像名称（默认：claw-master:<VERSION>）'
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
