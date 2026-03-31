# 📋 claw-master 容器部署建议

**检查时间：** 2026-03-31 21:10 CST

---

## 🔍 检查结果

### 当前状态

- ❌ **未找到** 以 `claw-master` 开头的容器
- ✅ OpenClaw 容器正在运行（名称：`/OpenClaw`）
- ✅ PostgreSQL 容器正在运行（名称：`/postgresql`）

### 现有容器列表

| 容器名称 | 是否 claw-master | 状态 |
|---------|-----------------|------|
| nice_pare | ❌ | Created |
| **OpenClaw** | ⚠️ (相关) | Running |
| astrbot | ❌ | Running |
| n8n | ❌ | Running |
| copaw | ❌ | Running |
| **postgresql** | ⚠️ (数据库) | Running |
| openlist | ❌ | Running |
| ngrok | ❌ | Running |
| mysql | ❌ | Running |
| openresty | ❌ | Running |

---

## 💡 建议方案

### 方案 A：使用现有 OpenClaw 容器（推荐）

当前 `/OpenClaw` 容器已经可以正常工作：

- ✅ 镜像：`1panel/openclaw:2026.3.28`
- ✅ 健康状态：healthy
- ✅ 数据库连接正常
- ✅ 端口：18789

**无需额外部署，直接使用即可！**

访问地址：http://localhost:18789

---

### 方案 B：部署新的 claw-master 容器

如果需要独立的 claw-master 容器，可以部署：

```bash
# 在宿主机执行
docker run -d \
  --name claw-master-latest \
  --restart unless-stopped \
  -p 18790:18789 \
  -e DATABASE_URL=postgresql://user_xKQftk:password_yP7FCG@postgresql:5432/claw-master \
  -e TZ=Asia/Shanghai \
  1panel/openclaw:2026.3.28
```

**注意：** 需要使用不同端口（如 18790），避免端口冲突。

---

### 方案 C：重命名现有容器

将现有 OpenClaw 容器重命名为 claw-master 格式：

```bash
# 停止容器
docker stop OpenClaw

# 重命名
docker rename OpenClaw claw-master-latest

# 启动容器
docker start claw-master-latest
```

---

## 📊 数据库状态

当前数据库已就绪：

- ✅ PostgreSQL 运行正常
- ✅ 数据库 `claw-master` 已创建
- ✅ 10 个表/视图完整
- ✅ 默认数据已初始化

**无论使用哪个容器，都可以连接同一数据库。**

---

## 🎯 推荐操作

### 如果只是为了使用：

**使用现有 OpenClaw 容器即可**，无需额外操作。

访问：http://localhost:18789  
登录：admin / Admin@123

### 如果需要标准化命名：

建议重命名容器为 `claw-master-latest`：

```bash
docker rename OpenClaw claw-master-latest
```

### 如果需要多版本并存：

可以部署新版本容器，使用不同端口：

```bash
# 版本 1
docker run -d --name claw-master-v1.0 -p 18790:18789 ...

# 版本 2
docker run -d --name claw-master-v1.1 -p 18791:18789 ...
```

---

## 📝 部署脚本

如需部署 claw-master 容器，可以使用工作区的部署脚本：

```bash
cd /home/node/.openclaw/agents/it-team/workspace

# 部署 claw-master-latest
python3 deploy-docker.py -v latest -p 18790

# 部署 claw-master-2026.3.31
python3 deploy-docker.py -v 2026.3.31 -p 18791
```

---

## ✅ 结论

**当前状态：可以使用**

虽然没有 `claw-master-*` 命名的容器，但现有 `/OpenClaw` 容器功能完整，可以直接使用。

如需标准化命名，建议重命名或重新部署。

---

*报告生成：IT-Team Agent*
