# 🚀 claw-master 快速部署指南

**5 分钟快速部署 claw-master 管理系统！**

---

## ⚡ 一键部署

```bash
cd /home/node/.openclaw/agents/it-team/workspace

# 执行一键部署
python3 build-and-deploy.py
```

就这么简单！✅

---

## 📋 部署后会得到什么

```
✅ claw-master-latest 容器（运行中）
✅ 镜像：claw-master:latest
✅ 端口：18789
✅ 数据库：已连接 postgresql:5432
✅ 访问地址：http://localhost:18789
```

---

## 🔑 登录系统

```
URL: http://localhost:18789
用户名：admin
密码：Admin@123
```

⚠️ **首次登录后请立即修改密码！**

---

## 🛠️ 常用命令

### 查看状态

```bash
# 容器状态
docker ps | grep claw-master

# 实时日志
docker logs -f claw-master-latest
```

### 管理容器

```bash
# 重启
docker restart claw-master-latest

# 停止
docker stop claw-master-latest

# 启动
docker start claw-master-latest

# 进入容器
docker exec -it claw-master-latest bash
```

### 删除重装

```bash
# 删除容器
docker rm -f claw-master-latest

# 重新部署
python3 build-and-deploy.py
```

---

## 🎯 自定义部署

### 使用不同端口

```bash
python3 build-and-deploy.py -p 8080
```

访问：http://localhost:8080

### 指定版本

```bash
python3 build-and-deploy.py -i claw-master:v1.0 -n claw-master-v1.0
```

### 强制重建

```bash
python3 build-and-deploy.py -r
```

---

## 📊 架构说明

```
┌─────────────────────────────┐
│  claw-master 容器            │
│                              │
│  ┌────────┐  ┌──────────┐  │
│  │ Nginx  │─▶│ Python   │  │
│  │ :80    │  │ :8000    │  │
│  └────────┘  └──────────┘  │
└─────────────────────────────┘
           │
           │ DATABASE_URL
           ▼
    ┌──────────────┐
    │  PostgreSQL  │
    │  :5432       │
    └──────────────┘
```

**特点：**
- ✅ 轻量化（无数据库）
- ✅ 高性能（Nginx + Python）
- ✅ 易部署（一键脚本）
- ✅ 易维护（健康检查）

---

## 🧪 验证部署

```bash
# 1. 检查容器
docker ps | grep claw-master

# 2. 测试健康检查
curl http://localhost:18789/health

# 3. 访问登录页
curl http://localhost:18789/login

# 4. 测试 API
curl http://localhost:18789/api/permissions
```

---

## ⚠️ 注意事项

1. **数据库必须已存在**
   - PostgreSQL 必须运行
   - claw-master 数据库必须创建
   - 表结构必须初始化

2. **端口不要冲突**
   - 默认使用 18789 端口
   - 如被占用，使用 `-p` 指定其他端口

3. **首次登录改密码**
   - 默认密码已知，存在风险
   - 登录后立即修改

4. **生产环境配置**
   - 启用 HTTPS
   - 配置防火墙
   - 定期备份数据

---

## 🐛 遇到问题？

### 容器启动失败

```bash
# 查看日志
docker logs claw-master-latest

# 检查数据库连接
docker exec -it claw-master-latest env | grep DATABASE
```

### 端口被占用

```bash
# 查找占用进程
netstat -tlnp | grep 18789

# 使用其他端口
python3 build-and-deploy.py -p 8080
```

### 无法访问数据库

```bash
# 测试数据库连接
docker exec -it claw-master-latest bash
python3 -c "import asyncio; from db import get_pool; print(asyncio.run(get_pool()))"
```

---

## 📖 详细文档

完整部署指南：[DEPLOYMENT.md](./DEPLOYMENT.md)

---

## ✅ 部署检查清单

- [ ] Docker 已安装
- [ ] PostgreSQL 运行中
- [ ] 端口 18789 可用
- [ ] 执行部署脚本
- [ ] 容器状态 healthy
- [ ] 可以访问登录页
- [ ] 登录成功
- [ ] 修改默认密码

---

**就这么简单！开始使用 claw-master 管理你的 OpenClaw 实例吧！** 🎉

---

*最后更新：2026-03-31*  
*维护者：IT-Team Agent*
