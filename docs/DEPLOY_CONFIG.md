# 🐳 Docker 部署配置说明

**文档位置：** `docs/DEPLOY_CONFIG.md`  
**更新时间：** 2026-04-01

---

## 📋 部署配置概览

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **容器名称** | `claw-master-<VERSION>` | 版本号自动读取 |
| **镜像名称** | `claw-master:<VERSION>` | 版本号自动读取 |
| **宿主机 IP** | `10.10.1.100` | 可访问地址 |
| **默认端口** | `38080` | 避免端口冲突 |
| **访问地址** | `http://10.10.1.100:38080` | 浏览器访问 |
| **数据库** | `postgresql:5432` | 外部 PostgreSQL |

---

## 🚀 快速部署

### 方式一：构建并部署（推荐）

```bash
# 一步完成构建和部署
python3 tools/build-and-deploy.py
```

### 方式二：仅部署（使用已有镜像）

```bash
# 部署当前版本
python3 tools/deploy-docker.py

# 强制重建容器
python3 tools/deploy-docker.py -r

# 跳过镜像拉取（使用本地镜像）
python3 tools/deploy-docker.py --skip-pull
```

---

## 📦 版本管理

### 自动版本号

脚本会自动从 `VERSION` 文件读取当前版本号：

```bash
# 查看当前版本
cat VERSION
# 输出：**当前版本：** 0.4.0

# 部署时自动使用版本号
python3 tools/build-and-deploy.py
# 容器名称：claw-master-0.4.0
# 镜像名称：claw-master:0.4.0
```

### 手动更新版本

```bash
# 补丁版本 +1（Bug 修复）
python3 tools/version.py bump patch

# 小版本 +1（新功能）
python3 tools/version.py bump minor

# 大版本 +1（重大更新）
python3 tools/version.py bump major
```

---

## 🔧 自定义配置

### 自定义端口

```bash
# 使用端口 48080
python3 tools/build-and-deploy.py -p 48080

# 或使用部署脚本
python3 tools/deploy-docker.py -p 48080
```

### 自定义镜像

```bash
# 指定镜像版本
python3 tools/deploy-docker.py -i claw-master:0.3.0

# 使用最新镜像
python3 tools/deploy-docker.py -i claw-master:latest
```

### 额外环境变量

创建 `.env.extra` 文件：

```bash
# .env.extra
LOG_LEVEL=DEBUG
ENABLE_METRICS=true
```

加载环境变量：

```bash
python3 tools/deploy-docker.py -e .env.extra
```

---

## 📁 数据持久化

### 宿主机目录

所有数据持久化到宿主机：`~/claw-master/`

```
~/claw-master/
├── data/      # 应用数据
├── logs/      # 日志文件
├── config/    # 配置文件
└── backups/   # 备份文件
```

### 目录说明

| 目录 | 容器内路径 | 说明 |
|------|-----------|------|
| `~/claw-master/data` | `/app/data` | 应用数据 |
| `~/claw-master/logs` | `/app/logs` | 日志文件 |
| `~/claw-master/config` | `/app/config` | 配置文件 |
| `~/claw-master/backups` | `/app/backups` | 备份文件 |

---

## 🌐 网络配置

### 端口映射

```
容器端口 80 → 宿主机端口 38080
```

### 访问地址

- **局域网访问：** `http://10.10.1.100:38080`
- **本地访问：** `http://localhost:38080`
- **远程访问：** `http://<宿主机IP>:38080`

### 防火墙配置

如需远程访问，确保防火墙开放端口：

```bash
# Ubuntu/Debian
sudo ufw allow 38080/tcp

# CentOS/RHEL
sudo firewall-cmd --add-port=38080/tcp --permanent
sudo firewall-cmd --reload
```

---

## 🗄️ 数据库配置

### 连接信息

```
数据库类型：PostgreSQL
数据库地址：postgresql:5432
数据库用户：user_xKQftk
数据库密码：password_yP7FCG
数据库名称：claw-master
```

### 环境变量

容器内自动配置以下环境变量：

```bash
DATABASE_URL=postgresql://user_xKQftk:password_yP7FCG@postgresql:5432/claw-master
DB_HOST=postgresql
DB_PORT=5432
DB_USER=user_xKQftk
DB_PASSWORD=password_yP7FCG
DB_NAME=claw-master
```

---

## 🛠️ 常用命令

### 容器管理

```bash
# 查看容器状态
docker ps -a | grep claw-master

# 查看日志
docker logs -f claw-master-0.4.0

# 重启容器
docker restart claw-master-0.4.0

# 停止容器
docker stop claw-master-0.4.0

# 启动容器
docker start claw-master-0.4.0

# 删除容器
docker rm -f claw-master-0.4.0
```

### 进入容器

```bash
# 进入容器 Shell
docker exec -it claw-master-0.4.0 bash

# 查看容器环境变量
docker exec claw-master-0.4.0 env

# 查看容器内进程
docker exec claw-master-0.4.0 ps aux
```

### 镜像管理

```bash
# 查看镜像
docker images | grep claw-master

# 删除旧镜像
docker rmi claw-master:0.3.0

# 导出镜像
docker save -o claw-master-0.4.0.tar claw-master:0.4.0

# 导入镜像
docker load -i claw-master-0.4.0.tar
```

---

## 📊 部署流程

### 完整部署流程

```
1. 读取 VERSION 文件获取版本号
   ↓
2. 生成容器名称：claw-master-<VERSION>
   ↓
3. 生成镜像名称：claw-master:<VERSION>
   ↓
4. 检查 Docker 连接
   ↓
5. 创建持久化目录：~/claw-master/
   ↓
6. 检查并停止现有容器
   ↓
7. 构建/拉取 Docker 镜像
   ↓
8. 创建并启动容器
   ↓
9. 验证容器状态
   ↓
10. 显示部署信息
```

### 部署输出示例

```
============================================================
  🚀 claw-master 部署脚本
============================================================

  版本号：    0.4.0
  容器名称：  claw-master-0.4.0
  镜像：      claw-master:0.4.0
  宿主机 IP:  10.10.1.100
  访问端口：  38080
  访问地址：  http://10.10.1.100:38080

[INFO] 检查 Docker 连接...
[✓] Docker 连接正常
[INFO] 创建持久化存储目录：/home/user/claw-master
[✓] 目录创建完成：/home/user/claw-master/{data,logs,config,backups}
...
[✓] 容器创建成功：a1b2c3d4e5f6
[✓] 容器启动成功
[INFO] 验证容器状态...
[✓] 容器运行正常 (状态：running)

============================================================
  ✅ 部署完成!
============================================================

  版本号：    0.4.0
  容器名称：  claw-master-0.4.0
  镜像：      claw-master:0.4.0
  访问地址：  http://10.10.1.100:38080
  登录账号：  admin / Admin@123
  数据库：    postgresql://user_xKQftk:password_yP7FCG@postgresql:5432/claw-master
  数据目录：  /home/user/claw-master
```

---

## 🔐 安全建议

### 默认密码

**首次登录后请立即修改默认密码！**

- 默认账号：`admin`
- 默认密码：`Admin@123`

### 生产环境配置

1. **修改默认密码**
2. **使用 HTTPS**（配置 SSL 证书）
3. **限制访问 IP**（防火墙规则）
4. **定期备份数据**
5. **监控日志文件**

---

## 🐛 故障排查

### 容器无法启动

```bash
# 查看容器日志
docker logs claw-master-0.4.0

# 查看容器状态
docker inspect claw-master-0.4.0

# 检查端口占用
netstat -tlnp | grep 38080
```

### 无法访问

```bash
# 检查容器是否运行
docker ps | grep claw-master

# 检查端口映射
docker port claw-master-0.4.0

# 检查防火墙
sudo ufw status

# 测试本地访问
curl http://localhost:38080
```

### 数据库连接失败

```bash
# 检查数据库容器
docker ps | grep postgresql

# 测试数据库连接
docker exec claw-master-0.4.0 python3 -c "
import asyncpg
import asyncio
async def test():
    conn = await asyncpg.connect('postgresql://user_xKQftk:password_yP7FCG@postgresql:5432/claw-master')
    await conn.close()
    print('数据库连接成功')
asyncio.run(test())
"
```

---

## 📖 相关文档

- [DEPLOYMENT.md](DEPLOYMENT.md) - 完整部署指南
- [QUICKSTART.md](QUICKSTART.md) - 快速开始
- [VERSIONING.md](VERSIONING.md) - 版本管理规范
- [MODULES.md](MODULES.md) - 系统模块说明

---

*最后更新：2026-04-01*  
*版本：0.4.0*
