# 🐳 claw-master Docker 部署指南

**版本：** 1.0.0  
**更新日期：** 2026-03-31

---

## 📋 概述

claw-master 管理系统 Docker 部署方案，包含：
- ✅ Python 3.11 运行环境
- ✅ Nginx Web 服务器
- ✅ 后端 API 服务（aiohttp）
- ✅ 前端静态文件
- ❌ **不包含数据库**（使用外部 PostgreSQL）

---

## 🏗️ 架构设计

```
┌─────────────────────────────────────────┐
│   claw-master Docker 容器                │
│                                          │
│  ┌──────────────┐    ┌───────────────┐  │
│  │   Nginx      │───▶│ Python 后端   │  │
│  │   端口 80    │    │   端口 8000   │  │
│  └──────────────┘    └───────────────┘  │
│         ▲                      │         │
│         │                      │         │
│         └──────────────────────┘         │
│                                          │
│  环境变量：DATABASE_URL                  │
└─────────────────────────────────────────┘
                    │
                    │ 连接
                    ▼
         ┌──────────────────┐
         │ 外部 PostgreSQL   │
         │ postgresql:5432  │
         └──────────────────┘
```

---

## 🚀 快速开始

### 方式一：一键构建并部署（推荐）

```bash
cd /home/node/.openclaw/agents/it-team/workspace

# 构建并部署
python3 build-and-deploy.py

# 指定端口部署
python3 build-and-deploy.py -p 8080

# 指定镜像和容器名
python3 build-and-deploy.py -i claw-master:v1.0 -n claw-master-v1.0 -p 18789
```

### 方式二：分步执行

```bash
# 1. 构建镜像
python3 build-and-deploy.py --build-only -i claw-master:latest

# 2. 部署容器
python3 build-and-deploy.py --deploy-only -i claw-master:latest -p 18789
```

### 方式三：手动 Docker 命令

```bash
# 1. 构建镜像
docker build -t claw-master:latest .

# 2. 部署容器
docker run -d \
  --name claw-master-latest \
  --restart unless-stopped \
  -p 18789:80 \
  -e DATABASE_URL=postgresql://user_xKQftk:password_yP7FCG@postgresql:5432/claw-master \
  -e TZ=Asia/Shanghai \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/config:/app/config \
  claw-master:latest
```

---

## 📦 文件结构

```
workspace/
├── Dockerfile                  # Docker 镜像定义
├── build-and-deploy.py         # 构建和部署脚本
├── backend/                    # Python 后端
│   ├── main.py                 # 主应用
│   ├── requirements.txt        # Python 依赖
│   ├── api/                    # API 路由
│   ├── services/               # 业务服务
│   └── models/                 # 数据模型
├── frontend/                   # 前端
│   ├── static/                 # 静态文件 (CSS, JS)
│   └── templates/              # HTML 模板
└── docker/                     # Docker 配置
    ├── nginx.conf              # Nginx 主配置
    ├── nginx-default.conf      # Nginx 服务器配置
    └── entrypoint.sh           # 启动脚本
```

---

## 🔧 配置选项

### 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | 数据库连接字符串 | `postgresql://user:pass@host:5432/db` |
| `DB_HOST` | 数据库主机 | `postgresql` |
| `DB_PORT` | 数据库端口 | `5432` |
| `DB_USER` | 数据库用户 | `user_xKQftk` |
| `DB_PASSWORD` | 数据库密码 | `password_yP7FCG` |
| `DB_NAME` | 数据库名称 | `claw-master` |
| `TZ` | 时区 | `Asia/Shanghai` |

### 端口映射

| 容器端口 | 主机端口 | 说明 |
|---------|---------|------|
| 80 | 18789 | HTTP Web 服务 |
| 443 | - | HTTPS（可选） |

### 卷挂载

| 容器路径 | 主机路径 | 说明 |
|---------|---------|------|
| `/app/logs` | `./logs` | 日志文件 |
| `/app/data` | `./data` | 数据文件 |
| `/app/config` | `./config` | 配置文件 |

---

## 🛠️ 部署脚本选项

### build-and-deploy.py 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--build-only` | 仅构建镜像 | - |
| `--deploy-only` | 仅部署容器 | - |
| `-i, --image` | 镜像名称 | `claw-master:latest` |
| `-p, --port` | 主机端口 | `18789` |
| `-n, --name` | 容器名称 | `claw-master-latest` |
| `-r, --rebuild` | 强制重建容器 | `false` |

### 示例

```bash
# 标准部署
python3 build-and-deploy.py

# 开发环境（使用不同端口）
python3 build-and-deploy.py -p 8080

# 生产环境（指定版本）
python3 build-and-deploy.py -i claw-master:2026.3.31 -n claw-master-prod -p 80

# 强制重建
python3 build-and-deploy.py -r

# 仅构建镜像
python3 build-and-deploy.py --build-only

# 仅部署（使用已有镜像）
python3 build-and-deploy.py --deploy-only
```

---

## 🔍 容器管理

### 查看容器状态

```bash
# 查看运行状态
docker ps | grep claw-master

# 查看所有状态（包括停止的）
docker ps -a | grep claw-master

# 查看详情
docker inspect claw-master-latest
```

### 查看日志

```bash
# 实时日志
docker logs -f claw-master-latest

# 最近 100 行
docker logs --tail 100 claw-master-latest

# 特定时间范围
docker logs --since 2026-03-31T10:00:00 claw-master-latest

# 查看启动日志
docker logs claw-master-latest 2>&1 | grep -E "(启动 | 成功|ERROR)"
```

### 进入容器

```bash
# 进入容器 shell
docker exec -it claw-master-latest bash

# 查看容器内进程
docker exec -it claw-master-latest ps aux

# 查看容器内环境变量
docker exec -it claw-master-latest env
```

### 重启容器

```bash
# 重启
docker restart claw-master-latest

# 停止
docker stop claw-master-latest

# 启动
docker start claw-master-latest
```

### 删除容器

```bash
# 删除容器
docker rm -f claw-master-latest

# 删除镜像
docker rmi claw-master:latest
```

---

## 🧪 验证部署

### 1. 检查容器状态

```bash
docker ps | grep claw-master
```

应该显示：
```
claw-master-latest   Up (healthy)
```

### 2. 检查端口

```bash
netstat -tlnp | grep 18789
# 或
ss -tlnp | grep 18789
```

### 3. 测试 HTTP 连接

```bash
# 健康检查
curl http://localhost:18789/health

# 登录页面
curl http://localhost:18789/login

# API 测试
curl http://localhost:18789/api/permissions
```

### 4. 测试登录

```bash
# 登录获取 session token
curl -X POST http://localhost:18789/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' \
  -c cookies.txt

# 使用 token 访问 API
curl http://localhost:18789/api/user -b cookies.txt
```

### 5. 检查数据库连接

```bash
# 进入容器
docker exec -it claw-master-latest bash

# 测试数据库连接
cd /app/backend
python3 -c "import asyncio; from services.auth import AuthService; print(asyncio.run(AuthService.authenticate('admin', 'Admin@123')))"
```

---

## 🐛 故障排查

### 问题 1：容器启动失败

**症状：**
```
docker ps 显示容器状态为 Exited
```

**解决方案：**
```bash
# 查看日志
docker logs claw-master-latest

# 检查配置文件
docker exec -it claw-master-latest cat /app/logs/error.log

# 常见原因：
# - 数据库连接失败
# - 端口被占用
# - 配置文件错误
```

### 问题 2：无法连接数据库

**症状：**
```
ERROR: connection to database failed
```

**解决方案：**
```bash
# 1. 检查 DATABASE_URL 环境变量
docker inspect claw-master-latest | grep DATABASE_URL

# 2. 测试数据库连接
docker exec -it claw-master-latest bash
psql postgresql://user_xKQftk:password_yP7FCG@postgresql:5432/claw-master

# 3. 检查网络连通性
docker exec -it claw-master-latest ping postgresql
```

### 问题 3：端口被占用

**症状：**
```
Error: Address already in use
```

**解决方案：**
```bash
# 1. 查找占用端口的进程
netstat -tlnp | grep 18789

# 2. 使用不同端口部署
python3 build-and-deploy.py -p 8080

# 3. 或者停止占用端口的容器
docker stop <container_name>
```

### 问题 4：Nginx 启动失败

**症状：**
```
nginx: [emerg] bind() to 0.0.0.0:80 failed
```

**解决方案：**
```bash
# 查看 Nginx 配置
docker exec -it claw-master-latest nginx -t

# 查看 Nginx 日志
docker exec -it claw-master-latest cat /var/log/nginx/error.log

# 重启容器
docker restart claw-master-latest
```

### 问题 5：Python 后端崩溃

**症状：**
```
后端进程退出，Nginx 返回 502 Bad Gateway
```

**解决方案：**
```bash
# 查看后端日志
docker logs claw-master-latest 2>&1 | grep -A 5 "Traceback"

# 检查依赖
docker exec -it claw-master-latest pip list

# 重新安装依赖
docker exec -it claw-master-latest pip install -r /app/backend/requirements.txt
```

---

## 🔐 安全建议

### 1. 修改默认密码

首次登录后立即修改 admin 账号密码！

### 2. 启用 HTTPS

生产环境配置 SSL 证书：

```bash
# 使用 Let's Encrypt
certbot --nginx -d your-domain.com
```

### 3. 限制数据库访问

确保 PostgreSQL 只允许容器网络访问：

```bash
# PostgreSQL 配置
pg_hba.conf:
host    claw-master    user_xKQftk    172.17.0.0/16    md5
```

### 4. 定期备份

```bash
# 备份数据目录
tar -czf claw-master-backup-$(date +%Y%m%d).tar.gz ./data ./config ./logs

# 导出数据库
docker exec postgresql pg_dump -U user_xKQftk claw-master > backup.sql
```

### 5. 日志轮转

已配置 Nginx 和 Docker 日志轮转：
- 单个日志文件最大：10MB
- 保留文件数：3 个

---

## 📊 性能优化

### 1. 使用多阶段构建（可选）

减小镜像大小：

```dockerfile
FROM python:3.11-slim as builder
# ... 构建步骤 ...

FROM python:3.11-slim
# ... 复制构建产物 ...
```

### 2. 启用缓存

配置 Redis 缓存（可选）：

```bash
docker run -d --name redis redis:alpine
```

### 3. 资源限制

限制容器资源使用：

```bash
docker run -d \
  --memory="512m" \
  --cpus="1.0" \
  ...
```

---

## 📝 部署检查清单

部署前确认：

- [ ] Docker 已安装并运行
- [ ] PostgreSQL 数据库可访问
- [ ] 数据库 claw-master 已创建
- [ ] 必要文件完整（Dockerfile, backend/, frontend/）
- [ ] 端口 18789 未被占用
- [ ] 有足够的磁盘空间（至少 1GB）

部署后验证：

- [ ] 容器状态为 healthy
- [ ] 可以访问登录页面
- [ ] 可以成功登录
- [ ] API 接口响应正常
- [ ] 数据库连接正常
- [ ] 日志正常输出

---

## 🎯 典型部署场景

### 场景 1：开发环境

```bash
python3 build-and-deploy.py -p 18789
```

### 场景 2：测试环境

```bash
python3 build-and-deploy.py -i claw-master:test -n claw-master-test -p 8080
```

### 场景 3：生产环境

```bash
# 1. 构建生产镜像
python3 build-and-deploy.py --build-only -i claw-master:2026.3.31

# 2. 部署到生产端口
python3 build-and-deploy.py --deploy-only -i claw-master:2026.3.31 -n claw-master-prod -p 80

# 3. 配置 HTTPS
# ... SSL 配置 ...
```

### 场景 4：多版本并存

```bash
# 版本 1.0
python3 build-and-deploy.py -i claw-master:v1.0 -n claw-master-v1.0 -p 18789

# 版本 1.1（测试）
python3 build-and-deploy.py -i claw-master:v1.1 -n claw-master-v1.1 -p 18790
```

---

## 📞 支持

遇到问题？

1. 查看日志：`docker logs -f claw-master-latest`
2. 检查容器状态：`docker inspect claw-master-latest`
3. 验证数据库连接：`docker exec claw-master-latest ping postgresql`
4. 查看文档：`cat DEPLOYMENT.md`

---

*文档维护：IT-Team Agent*  
*最后更新：2026-03-31*
