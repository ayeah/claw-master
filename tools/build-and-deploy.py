#!/usr/bin/env python3
"""
claw-master Docker 镜像构建和部署脚本

功能：
1. 读取 VERSION 文件获取当前版本号
2. 构建 claw-master-<VERSION> Docker 镜像
3. 部署到 Docker 容器
4. 使用外部数据库连接

使用方式:
  python3 tools/build-and-deploy.py                    # 构建并部署
  python3 tools/build-and-deploy.py --build-only       # 仅构建
  python3 tools/build-and-deploy.py --deploy-only      # 仅部署
  python3 tools/build-and-deploy.py --port 38080       # 指定端口
"""

import subprocess
import sys
import os
import socket
import http.client
import json
from pathlib import Path
from datetime import datetime


# ============================================================================
# 配置
# ============================================================================

DOCKER_SOCKET = '/var/run/docker.sock'
DEFAULT_PORT = 38080
HOST_IP = '10.10.1.100'

# 数据库配置
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


# ============================================================================
# 颜色输出
# ============================================================================

class Colors:
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'


def log_info(msg):
    print(f"{Colors.BLUE}[INFO]{Colors.NC} {msg}")


def log_success(msg):
    print(f"{Colors.GREEN}[✓]{Colors.NC} {msg}")


def log_warning(msg):
    print(f"{Colors.YELLOW}[!]]{Colors.NC} {msg}")


def log_error(msg):
    print(f"{Colors.RED}[✗]{Colors.NC} {msg}")


def log_step(msg):
    print(f"\n{Colors.CYAN}{'='*60}{Colors.NC}")
    print(f"{Colors.CYAN}{msg}{Colors.NC}")
    print(f"{Colors.CYAN}{'='*60}{Colors.NC}")


# ============================================================================
# 版本号管理
# ============================================================================

def read_version():
    """从 VERSION 文件读取当前版本号"""
    if not VERSION_FILE.exists():
        log_warning("VERSION 文件不存在，使用默认版本 0.0.0")
        return '0.0.0'
    
    content = VERSION_FILE.read_text()
    for line in content.split('\n'):
        if line.startswith('**当前版本：**'):
            version = line.split('**当前版本：**')[1].strip()
            log_success(f"读取版本号：{version}")
            return version
    
    log_warning("无法从 VERSION 文件读取版本号，使用默认版本 0.0.0")
    return '0.0.0'


def generate_container_name(version):
    """生成容器名称：claw-master-<VERSION>"""
    # 清理版本号中的特殊字符
    clean_version = version.replace(' ', '').replace('*', '')
    return f"claw-master-{clean_version}"


def generate_image_name(version):
    """生成镜像名称：claw-master:<VERSION>"""
    clean_version = version.replace(' ', '').replace('*', '')
    return f"claw-master:{clean_version}"


# ============================================================================
# Docker Client
# ============================================================================

class DockerClient:
    def __init__(self, socket_path=DOCKER_SOCKET):
        self.socket_path = socket_path
    
    def _connect(self):
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.connect(self.socket_path)
        conn = http.client.HTTPConnection('', timeout=60)
        conn.sock = sock
        return conn
    
    def request(self, method, endpoint, body=None, timeout=60):
        conn = self._connect()
        if timeout:
            conn.timeout = timeout
        
        headers = {}
        if body:
            headers['Content-Type'] = 'application/json'
            body = json.dumps(body) if isinstance(body, dict) else body
        
        conn.request(method, endpoint, body=body, headers=headers)
        resp = conn.getresponse()
        
        result = {
            'status': resp.status,
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
            _, status = self.get_json('/version')
            return status == 200
        except Exception as e:
            log_error(f"Docker 连接失败：{e}")
            return False


# ============================================================================
# 构建功能
# ============================================================================

def check_prerequisites():
    """检查前置条件"""
    log_step("📋 检查前置条件")
    
    # 检查 Docker 连接
    log_info("检查 Docker 连接...")
    client = DockerClient()
    if not client.check_connection():
        log_error("无法连接到 Docker daemon")
        return False, None
    log_success("Docker 连接正常")
    
    # 检查必要文件
    log_info("检查必要文件...")
    required_files = [
        'Dockerfile',
        'backend/main.py',
        'backend/requirements.txt',
        'frontend/templates/login.html',
        'frontend/templates/main.html',
        'docker/nginx.conf',
        'docker/nginx-default.conf',
        'docker/entrypoint.sh'
    ]
    
    for file in required_files:
        path = WORKSPACE_DIR / file
        if not path.exists():
            log_error(f"缺少文件：{file}")
            return False, None
    
    log_success("所有必要文件存在")
    return True, client


def build_image(image_name):
    """构建 Docker 镜像"""
    log_step(f"🔨 构建 Docker 镜像：{image_name}")
    
    cmd = [
        'docker', 'build',
        '-t', image_name,
        '-f', WORKSPACE_DIR / 'Dockerfile',
        str(WORKSPACE_DIR)
    ]
    
    log_info(f"执行：{' '.join(cmd)}")
    
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            cwd=str(WORKSPACE_DIR)
        )
        
        for line in process.stdout:
            line = line.strip()
            if line:
                if line.startswith('Step'):
                    print(f"\n  {line}")
                elif 'Downloading' in line or 'Extracting' in line:
                    print(f"  {line}", end='\r', flush=True)
                else:
                    print(f"  {line}")
        
        process.wait()
        
        if process.returncode == 0:
            log_success(f"镜像构建成功：{image_name}")
            return True
        else:
            log_error(f"镜像构建失败，返回码：{process.returncode}")
            return False
            
    except Exception as e:
        log_error(f"构建失败：{e}")
        return False


# ============================================================================
# 部署功能
# ============================================================================

def get_container_info(client, container_name):
    """获取容器信息"""
    containers, _ = client.get_json('/containers/json?all=true')
    
    for container in containers:
        name = container.get('Name', '').lstrip('/')
        if name == container_name:
            return {
                'id': container.get('Id', '')[:12],
                'state': container.get('State', {}).get('Status', 'unknown'),
                'running': container.get('State', {}).get('Running', False)
            }
    return None


def stop_and_remove_container(client, container_name):
    """停止并删除容器"""
    log_info(f"检查现有容器：{container_name}")
    
    info = get_container_info(client, container_name)
    if info:
        log_info(f"发现现有容器：{info['id']} ({info['state']})")
        
        if info['running']:
            log_info("停止容器...")
            client.request('POST', f'/containers/{container_name}/stop?t=10')
            log_success("容器已停止")
        
        log_info("删除容器...")
        client.delete(f'/containers/{container_name}')
        log_success("容器已删除")
    
    return True


def create_and_start_container(client, container_name, image_name, port):
    """创建并启动容器"""
    log_step(f"🚀 部署容器：{container_name}")
    
    # 构建环境变量
    db_url = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['name']}"
    
    env_vars = [
        f"DATABASE_URL={db_url}",
        f"DB_HOST={DB_CONFIG['host']}",
        f"DB_PORT={DB_CONFIG['port']}",
        f"DB_USER={DB_CONFIG['user']}",
        f"DB_PASSWORD={DB_CONFIG['password']}",
        f"DB_NAME={DB_CONFIG['name']}",
        "TZ=Asia/Shanghai",
        "PYTHONUNBUFFERED=1"
    ]
    
    # 构建卷挂载
    host_data_dir = Path.home() / 'claw-master'
    host_data_dir.mkdir(exist_ok=True)
    (host_data_dir / 'logs').mkdir(exist_ok=True)
    (host_data_dir / 'data').mkdir(exist_ok=True)
    (host_data_dir / 'config').mkdir(exist_ok=True)
    
    volumes = [
        f"{host_data_dir}/logs:/app/logs",
        f"{host_data_dir}/data:/app/data",
        f"{host_data_dir}/config:/app/config"
    ]
    
    # 创建容器配置
    config = {
        "Image": image_name,
        "Env": env_vars,
        "HostConfig": {
            "Binds": volumes,
            "PortBindings": {
                "80/tcp": [{"HostIp": "0.0.0.0", "HostPort": str(port)}]
            },
            "RestartPolicy": {"Name": "unless-stopped"},
            "LogConfig": {
                "Type": "json-file",
                "Config": {"max-size": "10m", "max-file": "3"}
            }
        }
    }
    
    log_info(f"创建容器 {container_name}...")
    result, status = client.post_json('/containers/create', config)
    
    if status != 201:
        log_error(f"创建容器失败：{result}")
        return False
    
    container_id = result.get('Id', '')[:12]
    log_success(f"容器创建成功：{container_id}")
    
    log_info("启动容器...")
    client.request('POST', f'/containers/{container_id}/start')
    log_success(f"容器启动成功")
    
    return container_id


def verify_deployment(client, container_name, port):
    """验证部署"""
    log_step("✅ 验证部署")
    
    # 等待容器启动
    log_info("等待容器启动...")
    import time
    time.sleep(3)
    
    # 检查容器状态
    info = get_container_info(client, container_name)
    if info:
        if info['running']:
            log_success(f"容器运行正常：{info['id']}")
        else:
            log_warning(f"容器未运行：{info['state']}")
            log_info("查看日志...")
            result = client.request('GET', f'/containers/{container_name}/logs?stdout=true&stderr=true&tail=50')
            print(result['body'][-500:] if len(result['body']) > 500 else result['body'])
            return False
    else:
        log_error("容器不存在")
        return False
    
    # 检查端口
    log_info(f"检查端口 {port}...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('127.0.0.1', port))
        sock.close()
        if result == 0:
            log_success(f"端口 {port} 已开放")
        else:
            log_warning(f"端口 {port} 无法连接")
    except Exception as e:
        log_warning(f"无法验证端口：{e}")
    
    return True


def print_deployment_summary(container_name, image_name, version, port):
    """打印部署总结"""
    log_step("📊 部署总结")
    
    access_url = f"http://{HOST_IP}:{port}"
    
    print(f"""
{Colors.GREEN}✅ 部署完成！{Colors.NC}

  版本号：    {Colors.CYAN}{version}{Colors.NC}
  容器名称：  {Colors.CYAN}{container_name}{Colors.NC}
  镜像名称：  {Colors.CYAN}{image_name}{Colors.NC}
  访问端口：  {Colors.CYAN}{port}{Colors.NC}
  
  访问地址：  {Colors.BLUE}{access_url}{Colors.NC}
  登录账号：  {Colors.YELLOW}admin / Admin@123{Colors.NC}

{Colors.YELLOW}⚠️  首次登录后请立即修改密码！{Colors.NC}

管理命令:
  查看日志：  docker logs -f {container_name}
  重启容器：  docker restart {container_name}
  停止容器：  docker stop {container_name}
  删除容器：  docker rm -f {container_name}
  进入容器：  docker exec -it {container_name} bash
""")


# ============================================================================
# 主函数
# ============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='claw-master Docker 镜像构建和部署脚本',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python3 tools/build-and-deploy.py                    # 构建并部署
  python3 tools/build-and-deploy.py --build-only       # 仅构建镜像
  python3 tools/build-and-deploy.py --deploy-only      # 仅部署容器
  python3 tools/build-and-deploy.py --port 38080       # 指定端口
  python3 tools/build-and-deploy.py --rebuild          # 强制重建容器
        """
    )
    
    parser.add_argument('--build-only', action='store_true',
                       help='仅构建镜像，不部署')
    parser.add_argument('--deploy-only', action='store_true',
                       help='仅部署容器，不构建镜像')
    parser.add_argument('-p', '--port', type=int, default=DEFAULT_PORT,
                       help=f'容器暴露端口 (默认：{DEFAULT_PORT})')
    parser.add_argument('-r', '--rebuild', action='store_true',
                       help='强制重建容器')
    
    args = parser.parse_args()
    
    # 读取版本号
    version = read_version()
    
    # 生成容器和镜像名称
    container_name = generate_container_name(version)
    image_name = generate_image_name(version)
    
    log_step("🚀 claw-master 构建和部署脚本")
    print(f"  工作区：   {WORKSPACE_DIR}")
    print(f"  版本号：   {version}")
    print(f"  镜像：     {image_name}")
    print(f"  容器：     {container_name}")
    print(f"  端口：     {args.port}")
    print(f"  访问地址： http://{HOST_IP}:{args.port}")
    
    # 检查前置条件
    success, client = check_prerequisites()
    if not success:
        sys.exit(1)
    
    # 构建镜像
    if not args.deploy_only:
        if not build_image(image_name):
            log_error("镜像构建失败")
            sys.exit(1)
    
    # 仅构建模式
    if args.build_only:
        log_success("构建完成")
        sys.exit(0)
    
    # 部署容器
    if args.rebuild:
        if not stop_and_remove_container(client, container_name):
            log_error("停止/删除容器失败")
            sys.exit(1)
    
    container_id = create_and_start_container(client, container_name, image_name, args.port)
    if not container_id:
        log_error("创建/启动容器失败")
        sys.exit(1)
    
    # 验证部署
    if not verify_deployment(client, container_name, args.port):
        log_error("部署验证失败")
        sys.exit(1)
    
    # 打印总结
    print_deployment_summary(container_name, image_name, version, args.port)


if __name__ == '__main__':
    main()
