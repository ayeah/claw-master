#!/bin/bash
#===============================================================================
# 脚本名称：deploy-docker.sh
# 功能描述：将开发环境代码部署到宿主主机的 Docker 容器中
# 容器名称：claw-master-version
# 数据库：postgresql://user_xKQftk:password_yP7FCG@postgresql:5432
# 持久化存储：~/claw-master/
#===============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
CONTAINER_PREFIX="claw-master"
VERSION=""  # 版本号，可通过 -v 参数指定
CONTAINER_NAME=""  # 将根据前缀和版本动态生成
IMAGE_NAME="1panel/openclaw:latest"  # 可自定义镜像
HOST_DATA_DIR="$HOME/claw-master"
DB_CONNECTION_STRING="postgresql://user_xKQftk:password_yP7FCG@postgresql:5432"

# 生成容器名称
generate_container_name() {
    if [ -n "$VERSION" ]; then
        echo "${CONTAINER_PREFIX}-${VERSION}"
    else
        echo "${CONTAINER_PREFIX}-latest"
    fi
}

# 解析数据库连接字符串
DB_HOST="postgresql"
DB_PORT="5432"
DB_USER="user_xKQftk"
DB_PASSWORD="password_yP7FCG"
DB_NAME=""

# 从连接字符串中提取数据库名（如果有）
if [[ "$DB_CONNECTION_STRING" =~ /([^/?]+) ]]; then
    DB_NAME="${BASH_REMATCH[1]}"
fi

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示使用说明
show_usage() {
    cat << EOF
用法：$0 [选项]

选项:
    -v, --version VER       版本号 (用于容器名称，如：v1.0.0、2026.3.28)
    -i, --image IMAGE       Docker 镜像名称 (默认：$IMAGE_NAME)
    -p, --port PORT         容器暴露端口 (默认：18789)
    -e, --env FILE          额外环境变量文件
    -r, --rebuild           强制重建容器
    -h, --help              显示此帮助信息

示例:
    $0                              # 使用默认配置部署 (claw-master-latest)
    $0 -v 2026.3.28                 # 指定版本 (claw-master-2026.3.28)
    $0 -v v1.0.0 -i myimage:latest  # 指定版本和镜像
    $0 -p 8080                      # 指定端口
    $0 -r                           # 强制重建容器
    $0 -v 2026.3.28 -p 8080 -r      # 组合选项

EOF
}

# 解析命令行参数
FORCE_REBUILD=false
EXTRA_ENV_FILE=""
EXPOSE_PORT="18789"
VERSION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -i|--image)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -p|--port)
            EXPOSE_PORT="$2"
            shift 2
            ;;
        -e|--env)
            EXTRA_ENV_FILE="$2"
            shift 2
            ;;
        -r|--rebuild)
            FORCE_REBUILD=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "未知选项：$1"
            show_usage
            exit 1
            ;;
    esac
done

# 生成容器名称
CONTAINER_NAME=$(generate_container_name)

#===============================================================================
# 主部署流程
#===============================================================================

echo ""
echo "==============================================================================="
echo "  🚀 OpenClaw 部署脚本"
echo "==============================================================================="
echo ""
echo "  容器名称：$CONTAINER_NAME"
echo "  镜像：    $IMAGE_NAME"
echo "  版本：    ${VERSION:-latest}"
echo ""

# 1. 检查 Docker 连接
log_info "检查 Docker 连接..."
if ! python3 -c "
import socket
import http.client
try:
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.connect('/var/run/docker.sock')
    conn = http.client.HTTPConnection('', timeout=5)
    conn.sock = sock
    conn.request('GET', '/version')
    resp = conn.getresponse()
    if resp.status == 200:
        exit(0)
    else:
        exit(1)
except Exception as e:
    print(f'Error: {e}')
    exit(1)
" 2>/dev/null; then
    log_error "无法连接到 Docker daemon"
    exit 1
fi
log_success "Docker 连接正常"

# 2. 创建持久化目录
log_info "创建持久化存储目录：$HOST_DATA_DIR"
mkdir -p "$HOST_DATA_DIR"/{data,logs,config,backups}
log_success "目录创建完成"

# 3. 检查并停止现有容器
log_info "检查现有容器..."
CONTAINER_EXISTS=$(python3 -c "
import socket, http.client, json
sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.connect('/var/run/docker.sock')
conn = http.client.HTTPConnection('', timeout=5)
conn.sock = sock
conn.request('GET', '/containers/json?all=true')
resp = conn.getresponse()
containers = json.loads(resp.read().decode())
for c in containers:
    names = c.get('Names', [])
    name = c.get('Name', '').lstrip('/')
    if not name and names:
        name = names[0].lstrip('/')
    if name == '$CONTAINER_NAME':
        state = c.get('State', {}).get('Status', 'unknown')
        print(state)
        break
conn.close()
sock.close()
" 2>/dev/null)

if [ -n "$CONTAINER_EXISTS" ]; then
    log_warning "发现现有容器：$CONTAINER_NAME (状态：$CONTAINER_EXISTS)"
    
    if [ "$FORCE_REBUILD" = true ]; then
        log_info "强制重建模式：删除现有容器..."
        python3 -c "
import socket, http.client
sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.connect('/var/run/docker.sock')
conn = http.client.HTTPConnection('', timeout=5)
conn.sock = sock

# 先停止
conn.request('POST', '/containers/$CONTAINER_NAME/stop?t=30')
resp = conn.getresponse()
resp.read()

# 再删除
conn.request('DELETE', '/containers/$CONTAINER_NAME')
resp = conn.getresponse()
resp.read()

conn.close()
sock.close()
print('容器已删除')
" 2>/dev/null
        log_success "现有容器已删除"
    else
        log_info "停止现有容器..."
        python3 -c "
import socket, http.client
sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.connect('/var/run/docker.sock')
conn = http.client.HTTPConnection('', timeout=5)
conn.sock = sock
conn.request('POST', '/containers/$CONTAINER_NAME/stop?t=30')
resp = conn.getresponse()
resp.read()
conn.close()
sock.close()
print('容器已停止')
" 2>/dev/null
        log_success "容器已停止"
    fi
else
    log_info "未发现现有容器"
fi

# 4. 拉取最新镜像
log_info "拉取 Docker 镜像：$IMAGE_NAME"
python3 -c "
import socket, http.client, json
sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.connect('/var/run/docker.sock')
conn = http.client.HTTPConnection('', timeout=300)
conn.sock = sock

# 创建 pull 请求
conn.request('POST', '/images/create?fromImage=$IMAGE_NAME'.replace(':', '%3A').replace('/', '%2F'))
resp = conn.getresponse()

# 读取并显示进度
import sys
while True:
    line = resp.readline()
    if not line:
        break
    try:
        data = json.loads(line.decode())
        if 'status' in data:
            status = data['status']
            if 'progressDetail' in data:
                detail = data['progressDetail']
                if 'current' in detail and 'total' in detail:
                    percent = (detail['current'] / detail['total']) * 100 if detail['total'] > 0 else 100
                    sys.stdout.write(f'\r  下载进度：{status} - {percent:.1f}%')
                else:
                    sys.stdout.write(f'\r  状态：{status}')
            else:
                sys.stdout.write(f'\r  状态：{status}')
            sys.stdout.flush()
    except:
        pass

print()
conn.close()
sock.close()
" 2>/dev/null
log_success "镜像拉取完成"

# 5. 创建并启动容器
log_info "创建并启动容器..."

# 构建容器创建配置
python3 << PYTHON_SCRIPT
import socket
import http.client
import json

DOCKER_SOCKET = '/var/run/docker.sock'

# 容器配置
config = {
    "name": "$CONTAINER_NAME",
    "Image": "$IMAGE_NAME",
    "Env": [
        "DATABASE_URL=$DB_CONNECTION_STRING",
        "DB_HOST=$DB_HOST",
        "DB_PORT=$DB_PORT",
        "DB_USER=$DB_USER",
        "DB_PASSWORD=$DB_PASSWORD",
        "DB_NAME=$DB_NAME",
        "TZ=Asia/Shanghai"
    ],
    "HostConfig": {
        "Binds": [
            "$HOST_DATA_DIR/data:/app/data",
            "$HOST_DATA_DIR/logs:/app/logs",
            "$HOST_DATA_DIR/config:/app/config",
            "$HOST_DATA_DIR/backups:/app/backups"
        ],
        "PortBindings": {
            "18789/tcp": [
                {
                    "HostIp": "0.0.0.0",
                    "HostPort": "$EXPOSE_PORT"
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

# 添加额外环境变量
extra_env_file = "$EXTRA_ENV_FILE"
if extra_env_file:
    try:
        with open(extra_env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    config["Env"].append(line)
        print(f"已加载额外环境变量：{extra_env_file}")
    except Exception as e:
        print(f"警告：无法加载环境变量文件：{e}")

# 连接 Docker
sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.connect(DOCKER_SOCKET)
conn = http.client.HTTPConnection('', timeout=60)
conn.sock = sock

# 创建容器
conn.request('POST', '/containers/create', 
    body=json.dumps(config),
    headers={'Content-Type': 'application/json'})
resp = conn.getresponse()
result = json.loads(resp.read().decode())

if resp.status != 201:
    print(f"创建容器失败：{result}")
    exit(1)

container_id = result.get('Id', '')
print(f"容器创建成功：{container_id[:12]}")

# 启动容器
conn.request('POST', f'/containers/{container_id}/start')
resp = conn.getresponse()
resp.read()

if resp.status in [200, 204]:
    print(f"容器启动成功")
else:
    print(f"启动容器失败：{resp.status}")
    exit(1)

conn.close()
sock.close()
PYTHON_SCRIPT

if [ $? -eq 0 ]; then
    log_success "容器创建并启动成功"
else
    log_error "容器创建或启动失败"
    exit 1
fi

# 6. 验证容器状态
sleep 3
log_info "验证容器状态..."
CONTAINER_STATUS=$(python3 -c "
import socket, http.client, json
sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.connect('/var/run/docker.sock')
conn = http.client.HTTPConnection('', timeout=5)
conn.sock = sock
conn.request('GET', '/containers/$CONTAINER_NAME/json')
resp = conn.getresponse()
data = json.loads(resp.read().decode())
state = data.get('State', {})
print(state.get('Status', 'unknown'))
conn.close()
sock.close()
" 2>/dev/null)

if [ "$CONTAINER_STATUS" = "running" ]; then
    log_success "容器运行正常 (状态：$CONTAINER_STATUS)"
else
    log_warning "容器状态异常：$CONTAINER_STATUS"
fi

# 7. 显示部署信息
echo ""
echo "==============================================================================="
echo "  ✅ 部署完成!"
echo "==============================================================================="
echo ""
echo "  容器名称：    $CONTAINER_NAME"
echo "  镜像：        $IMAGE_NAME"
echo "  版本：        ${VERSION:-latest}"
echo "  访问端口：    $EXPOSE_PORT"
echo "  数据库：      $DB_CONNECTION_STRING"
echo "  数据目录：    $HOST_DATA_DIR"
echo ""
echo "  子目录结构:"
echo "    - $HOST_DATA_DIR/data     (应用数据)"
echo "    - $HOST_DATA_DIR/logs     (日志文件)"
echo "    - $HOST_DATA_DIR/config   (配置文件)"
echo "    - $HOST_DATA_DIR/backups  (备份文件)"
echo ""
echo "  常用命令:"
echo "    查看日志：     docker logs -f $CONTAINER_NAME"
echo "    进入容器：     docker exec -it $CONTAINER_NAME bash"
echo "    重启容器：     docker restart $CONTAINER_NAME"
echo "    停止容器：     docker stop $CONTAINER_NAME"
echo "    删除容器：     docker rm -f $CONTAINER_NAME"
echo ""
echo "==============================================================================="
echo ""
