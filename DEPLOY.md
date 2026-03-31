# OpenClaw Docker 部署指南

**最后更新：** 2026-03-31  
**版本：** 1.0.0

---

## 📋 概述

本部署脚本用于将 OpenClaw 开发环境代码部署到宿主主机的 Docker 容器中。

### 部署配置

| 配置项 | 值 |
|--------|-----|
| **容器名称前缀** | `claw-master` |
| **版本变量** | 根据前后端开发版本动态生成 |
| **容器名称格式** | `claw-master-<version>` 或 `claw-master-latest` |
| **默认镜像** | `1panel/openclaw:latest` |
| **默认端口** | `18789` |
| **数据库连接** | `postgresql://user_xKQftk:password_yP7FCG@postgresql:5432` |
| **数据目录** | `~/claw-master/` |

---

## 🚀 快速开始

### 方式一：使用 Python 脚本（推荐）

```bash
# 基本部署（claw-master-latest）
python3 deploy-docker.py

# 指定版本号（claw-master-2026.3.28）
python3 deploy-docker.py -v 2026.3.28

# 指定镜像和端口
python3 deploy-docker.py -i 1panel/openclaw:2026.3.28 -p 8080

# 指定版本、镜像和端口（claw-master-v1.0.0）
python3 deploy-docker.py -v v1.0.0 -i 1panel/openclaw:2026.3.28 -p 8080

# 强制重建容器
python3 deploy-docker.py -r

# 加载额外环境变量
python3 deploy-docker.py -e .env.extra
```

### 方式二：使用 Shell 脚本

```bash
# 基本部署（claw-master-latest）
./deploy-docker.sh

# 指定版本号（claw-master-2026.3.28）
./deploy-docker.sh -v 2026.3.28

# 指定镜像和端口
./deploy-docker.sh -i 1panel/openclaw:2026.3.28 -p 8080

# 指定版本、镜像和端口
./deploy-docker.sh -v v1.0.0 -i 1panel/openclaw:2026.3.28 -p 8080

# 强制重建容器
./deploy-docker.sh -r
```

---

## 📖 命令选项

### Python 脚本选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-v, --version` | 版本号（用于容器名称） | `latest` |
| `-i, --image` | Docker 镜像名称 | `1panel/openclaw:latest` |
| `-p, --port` | 容器暴露端口 | `18789` |
| `-e, --env` | 额外环境变量文件路径 | - |
| `-r, --rebuild` | 强制重建容器（删除现有） | `false` |
| `--skip-pull` | 跳过镜像拉取 | `false` |

### Shell 脚本选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-v, --version` | 版本号（用于容器名称） | `latest` |
| `-i, --image` | Docker 镜像名称 | `1panel/openclaw:latest` |
| `-p, --port` | 容器暴露端口 | `18789` |
| `-e, --env` | 额外环境变量文件 | - |
| `-r, --rebuild` | 强制重建容器 | `false` |
| `-h, --help` | 显示帮助信息 | - |

---

## 📁 持久化存储结构

部署脚本会在宿主主机创建以下目录结构：

```
~/claw-master/
├── data/          # 应用数据
├── logs/          # 日志文件
├── config/        # 配置文件
└── backups/       # 备份文件
```

### 挂载点映射

| 宿主机路径 | 容器路径 | 说明 |
|-----------|----------|------|
| `~/claw-master/data` | `/app/data` | 应用数据 |
| `~/claw-master/logs` | `/app/logs` | 日志文件 |
| `~/claw-master/config` | `/app/config` | 配置文件 |
| `~/claw-master/backups` | `/app/backups` | 备份文件 |

---

## 🔧 环境变量配置

### 默认环境变量

脚本会自动设置以下环境变量：

```bash
DATABASE_URL=postgresql://user_xKQftk:password_yPFC@postgresql:5432
DB_HOST=postgresql
DB_PORT=5432
DB_USER=user_xKQftk
DB_PASSWORD=password_yP7FCG
DB_NAME=
TZ=Asia/Shanghai
```

### 添加自定义环境变量

创建额外环境变量文件（如 `.env.extra`）：

```bash
# .env.extra 示例
LOG_LEVEL=INFO
DEBUG=false
MAX_CONNECTIONS=100
CACHE_TTL=3600
```

然后在部署时加载：

```bash
python3 deploy-docker.py -e .env.extra
```

---

## 🛠️ 容器管理命令

### 查看容器状态

```bash
docker ps | grep claw-master-version
```

### 查看容器日志

```bash
# 查看实时日志
docker logs -f claw-master-version

# 查看最近 100 行
docker logs --tail 100 claw-master-version

# 查看特定时间范围的日志
docker logs --since 2026-03-31T10:00:00 claw-master-version
```

### 进入容器

```bash
docker exec -it claw-master-version bash
```

### 重启容器

```bash
docker restart claw-master-version
```

### 停止容器

```bash
docker stop claw-master-version
```

### 启动容器

```bash
docker start claw-master-version
```

### 删除容器

```bash
docker rm -f claw-master-version
```

### 查看容器详情

```bash
docker inspect claw-master-version
```

---

## 📊 部署流程

```
┌─────────────────────────────────────────────────────────────┐
│                      部署流程                                │
├─────────────────────────────────────────────────────────────┤
│  1. 检查 Docker 连接                                         │
│  2. 创建持久化存储目录 (~/claw-master/)                      │
│  3. 检查并停止现有容器                                       │
│  4. 拉取最新 Docker 镜像                                      │
│  5. 创建新容器（配置环境变量、卷挂载、端口映射）              │
│  6. 启动容器                                                 │
│  7. 验证容器状态                                             │
│  8. 输出部署信息                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 故障排查

### 问题 1：无法连接到 Docker daemon

**症状：**
```
[ERROR] 无法连接到 Docker daemon
```

**解决方案：**
1. 确认 Docker socket 权限正确
2. 检查当前用户是否在 docker 组
3. 运行权限修复脚本

### 问题 2：端口已被占用

**症状：**
```
Error starting container: Bind for 0.0.0.0:18789 failed: port is already allocated
```

**解决方案：**
```bash
# 使用其他端口
python3 deploy-docker.py -p 8080
```

### 问题 3：容器启动失败

**症状：**
容器状态为 `exited` 或 `restart`

**解决方案：**
```bash
# 查看容器日志
docker logs claw-master-version

# 检查容器配置
docker inspect claw-master-version

# 查看容器资源使用
docker stats claw-master-version
```

### 问题 4：数据库连接失败

**症状：**
日志中出现数据库连接错误

**解决方案：**
1. 确认 PostgreSQL 容器正在运行
2. 检查数据库连接字符串是否正确
3. 验证网络连通性

```bash
# 进入容器测试数据库连接
docker exec -it claw-master-version bash
psql -h postgresql -U user_xKQftk -d postgres
```

---

## 📝 部署示例

### 示例 1：标准部署（latest）

```bash
# 使用默认配置部署
python3 deploy-docker.py
```

输出：
```
================================================================================
  🚀 OpenClaw 部署脚本
================================================================================

  容器名称：claw-master-latest
  镜像：    1panel/openclaw:latest
  版本：    latest

[INFO] 检查 Docker 连接...
[SUCCESS] Docker 连接正常
...
================================================================================
  ✅ 部署完成!
================================================================================

  容器名称：    claw-master-latest
  镜像：        1panel/openclaw:latest
  访问端口：    18789
  ...
```

### 示例 2：指定版本部署

```bash
# 部署特定版本（前后端开发生成的版本）
python3 deploy-docker.py -v 2026.3.28
```

输出：
```
================================================================================
  🚀 OpenClaw 部署脚本
================================================================================

  容器名称：claw-master-2026.3.28
  镜像：    1panel/openclaw:latest
  版本：    2026.3.28
...
```

### 示例 3：生产环境部署

```bash
# 指定特定版本镜像和端口
python3 deploy-docker.py \
  -v 2026.3.28 \
  -i 1panel/openclaw:2026.3.28 \
  -p 80 \
  -e prod.env \
  -r
```

### 示例 4：开发环境部署

```bash
# 使用本地镜像，跳过拉取
python3 deploy-docker.py \
  -v dev-20260331 \
  -i 1panel/openclaw:dev \
  -p 18789 \
  --skip-pull
```

### 示例 5：多版本并存

```bash
# 部署多个版本进行测试
python3 deploy-docker.py -v v1.0.0 -p 8080
python3 deploy-docker.py -v v1.1.0 -p 8081
python3 deploy-docker.py -v v1.2.0-beta -p 8082
```

---

## 🔐 安全建议

1. **修改默认密码**
   - 部署后应立即修改数据库默认密码
   
2. **限制端口访问**
   - 使用防火墙限制访问来源
   - 考虑使用反向代理

3. **定期备份**
   - 定期备份 `~/claw-master/data` 目录
   - 导出容器配置

4. **日志监控**
   - 配置日志轮转
   - 监控异常日志

---

## 📞 支持

如有问题，请检查：
1. 容器日志：`docker logs claw-master-version`
2. 容器状态：`docker ps -a | grep claw-master-version`
3. 系统资源：`docker stats`

---

*文档生成：IT-Team Agent*
