# 🚀 OpenClaw 快速部署指南

---

## 📦 已创建的文件

| 文件 | 说明 | 大小 |
|------|------|------|
| `deploy-docker.py` | Python 部署脚本（推荐） | 15KB |
| `deploy-docker.sh` | Shell 部署脚本 | 11KB |
| `DEPLOY.md` | 完整部署文档 | 8KB |
| `.env.extra.example` | 环境变量配置示例 | 3KB |

---

## ⚡ 快速部署命令

### 默认部署（latest）

```bash
cd /home/node/.openclaw/agents/it-team/workspace
python3 deploy-docker.py
# 容器名称：claw-master-latest
```

### 指定版本部署

```bash
# 使用前后端开发生成的版本号
python3 deploy-docker.py -v 2026.3.28
# 容器名称：claw-master-2026.3.28

# 或使用语义化版本
python3 deploy-docker.py -v v1.0.0
# 容器名称：claw-master-v1.0.0
```

### 自定义部署

```bash
# 指定镜像版本和端口
python3 deploy-docker.py -v 2026.3.28 -i 1panel/openclaw:2026.3.28 -p 8080

# 强制重建容器
python3 deploy-docker.py -v 2026.3.28 -r

# 使用额外环境变量
python3 deploy-docker.py -v 2026.3.28 -e .env.extra
```

---

## 📋 部署配置

### 容器信息

| 配置项 | 值 |
|--------|-----|
| **容器名称前缀** | `claw-master` |
| **版本变量** | 根据前后端开发版本动态生成 |
| **容器名称格式** | `claw-master-<version>` 或 `claw-master-latest` |
| **数据库** | `postgresql://user_xKQftk:password_yP7FCG@postgresql:5432` |
| **数据目录** | `~/claw-master/` |

### 默认端口映射

| 容器端口 | 主机端口 | 说明 |
|---------|---------|------|
| 18789 | 18789 | OpenClaw Web 界面 |

---

## 🔧 部署后操作

### 1. 查看容器状态

```bash
docker ps | grep claw-master-version
```

### 2. 查看实时日志

```bash
docker logs -f claw-master-version
```

### 3. 访问应用

打开浏览器访问：`http://<主机 IP>:18789`

### 4. 进入容器

```bash
docker exec -it claw-master-version bash
```

---

## 📁 数据持久化

所有数据保存在宿主主机：

```
~/claw-master/
├── data/          # 应用数据
├── logs/          # 日志文件
├── config/        # 配置文件
└── backups/       # 备份文件
```

---

## 🛠️ 常用管理命令

```bash
# 重启容器
docker restart claw-master-version

# 停止容器
docker stop claw-master-version

# 启动容器
docker start claw-master-version

# 删除容器
docker rm -f claw-master-version

# 查看容器详情
docker inspect claw-master-version

# 查看资源使用
docker stats claw-master-version
```

---

## ⚠️ 注意事项

1. **首次部署**会自动拉取镜像，可能需要几分钟
2. **强制重建** (`-r`) 会删除现有容器，但保留数据
3. **修改端口**时确保端口未被占用
4. **数据库连接**需要 PostgreSQL 容器正在运行

---

## 🆘 故障排查

### 查看日志
```bash
docker logs --tail 100 claw-master-version
```

### 检查容器状态
```bash
docker ps -a | grep claw-master-version
```

### 检查端口占用
```bash
netstat -tlnp | grep 18789
```

### 检查数据库连接
```bash
docker exec -it claw-master-version bash
# 在容器内测试数据库连接
```

---

## 📞 需要帮助？

查看详细文档：`DEPLOY.md`

---

*创建时间：2026-03-31*  
*IT-Team Agent*
