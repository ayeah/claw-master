# Docker Socket 访问问题分析报告

**分析时间：** 2026-03-31 10:28 UTC  
**分析对象：** `/var/run/docker.sock`

---

## 🔍 问题现象

当前环境无法通过 `/var/run/docker.sock` 访问宿主主机的 Docker 服务。

**错误信息：**
```
PermissionError: [Errno 13] Permission denied
```

---

## 📋 环境诊断结果

### 1. 当前用户信息

| 属性 | 值 |
|------|-----|
| **用户名** | `node` |
| **UID** | 1000 |
| **GID** | 1000 (node 组) |
| **所属组** | 仅 `node` 组 |

### 2. Docker Socket 权限

| 属性 | 值 |
|------|-----|
| **路径** | `/var/run/docker.sock` |
| **类型** | Socket (套接字) |
| **权限** | `0660` (srw-rw----) |
| **所有者** | `root` (UID: 0) |
| **所属组** | `GID: 996` |

### 3. 运行环境

| 检查项 | 结果 |
|--------|------|
| **是否在容器内** | ✅ 是 (overlay 文件系统) |
| **容器类型** | Docker in Docker (DinD) |
| **Socket 挂载** | ✅ 已挂载 (tmpfs) |
| **docker 组存在** | ❌ 不存在 |
| **GID 996 组** | ❌ 不存在 |

---

## ⚠️ 根本原因分析

### 原因 1：用户组权限不匹配

Docker socket 权限为 `0660`，只有以下用户可以访问：
- **所有者**：`root` (UID: 0)
- **组成员**：`GID 996` 的成员

当前用户 `node` (UID: 1000, GID 1000) **既不是 root，也不属于 GID 996 组**。

### 原因 2：容器内缺少 docker 组定义

在容器内部，`/etc/group` 中没有定义 `docker` 组或 `GID 996` 对应的组，因此：
- 无法通过 `usermod -aG docker node` 添加用户到组
- 即使添加了，组 GID 也需要匹配宿主机的 996

### 原因 3：Docker-in-Docker 架构限制

当前运行的是 **DinD (Docker in Docker)** 架构：
- OpenClaw 运行在 Docker 容器内
- Docker socket 从宿主机挂载到容器
- 宿主机和容器的用户/组 ID 映射不一致

---

## 🔧 解决方案

### 方案 1：修改容器内用户组（推荐 ⭐）

在容器内将 `node` 用户添加到 GID 996 组：

```bash
# 1. 创建 GID 996 组（名称任意，建议用 docker）
groupadd -g 996 docker

# 2. 将 node 用户添加到 docker 组
usermod -aG docker node

# 3. 验证
id node
# 应该显示：uid=1000(node) gid=1000(node) groups=1000(node),996(docker)

# 4. 测试连接
python3 docker_container_viewer.py --all --info
```

**注意：** 此修改在容器重启后会失效，需要持久化配置。

---

### 方案 2：修改 Docker socket 权限（快速测试）

如果有宿主机 root 权限，可以临时修改 socket 权限：

```bash
# 在宿主机执行
sudo chmod 0666 /var/run/docker.sock
```

**⚠️ 安全警告：** 这会让所有用户都能控制 Docker，降低安全性，仅用于测试。

---

### 方案 3：配置 Docker daemon 组（永久方案）

在宿主机上修改 Docker 配置，使用标准 `docker` 组：

```bash
# 1. 在宿主机创建 docker 组（如果不存在）
sudo groupadd docker 2>/dev/null || true

# 2. 获取 docker 组 GID
Docker_GID=$(getent group docker | cut -d: -f3)
echo "Docker 组 GID: $Docker_GID"

# 3. 修改 Docker daemon 配置
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "group": "docker"
}
EOF

# 4. 重启 Docker 服务
sudo systemctl restart docker

# 5. 验证 socket 权限
ls -la /var/run/docker.sock
# 应该显示：srw-rw---- 1 root docker ...
```

然后在容器内：

```bash
# 在容器内创建相同 GID 的 docker 组
groupadd -g $(stat -c '%g' /var/run/docker.sock) docker 2>/dev/null || true
usermod -aG docker node
```

---

### 方案 4：使用 Docker 容器启动参数（最佳实践）

修改 OpenClaw 容器的启动配置，在启动时自动处理组权限：

```bash
# 如果使用 docker run 启动
docker run -d \
  --name openclaw \
  --user 1000:996 \  # 指定用户：组
  -v /var/run/docker.sock:/var/run/docker.sock \
  1panel/openclaw:2026.3.28

# 或者使用 --group-add
docker run -d \
  --name openclaw \
  --group-add 996 \  # 添加额外组
  -v /var/run/docker.sock:/var/run/docker.sock \
  1panel/openclaw:2026.3.28
```

---

### 方案 5：使用 init 脚本自动修复（持久化）

创建启动脚本，在容器启动时自动修复权限：

```bash
# 创建脚本
cat > /home/node/.openclaw/scripts/fix-docker-perm.sh <<'EOF'
#!/bin/bash
# Docker Socket 权限修复脚本

SOCKET="/var/run/docker.sock"
TARGET_GID=$(stat -c '%g' "$SOCKET" 2>/dev/null)

if [ -n "$TARGET_GID" ] && [ "$TARGET_GID" != "1000" ]; then
    echo "修复 Docker socket 权限 (GID: $TARGET_GID)..."
    
    # 创建组（如果不存在）
    if ! getent group docker >/dev/null 2>&1; then
        groupadd -g "$TARGET_GID" docker 2>/dev/null || \
        groupadd docker 2>/dev/null || true
    fi
    
    # 添加用户到组
    usermod -aG docker node 2>/dev/null || true
    
    echo "修复完成"
    id node
else
    echo "无需修复或无法获取 socket GID"
fi
EOF

chmod +x /home/node/.openclaw/scripts/fix-docker-perm.sh

# 执行修复
/home/node/.openclaw/scripts/fix-docker-perm.sh
```

---

## 📝 推荐执行步骤

### 立即修复（容器内执行）：

```bash
# 1. 获取 socket GID
TARGET_GID=$(stat -c '%g' /var/run/docker.sock)
echo "Docker socket GID: $TARGET_GID"

# 2. 创建 docker 组
sudo groupadd -g $TARGET_GID docker 2>/dev/null || sudo groupadd docker

# 3. 添加用户到组
sudo usermod -aG docker node

# 4. 刷新组（需要重新登录或执行）
newgrp docker

# 5. 验证
id
python3 docker_container_viewer.py --all --info
```

### 永久修复（宿主机执行）：

1. 修改 OpenClaw 容器启动配置，添加 `--group-add 996` 或 `--user 1000:996`
2. 或者配置 Docker daemon 使用标准 `docker` 组
3. 重启 OpenClaw 容器

---

## 🔐 安全注意事项

1. **Docker socket 权限 = root 权限**
   - 能访问 Docker socket 的用户可以完全控制宿主机
   - 不要轻易设置 `chmod 666`

2. **组权限管理**
   - 只将可信用户添加到 docker 组
   - 定期审计 docker 组成员

3. **容器隔离**
   - DinD 架构下，容器内获得 Docker 权限等同于宿主机 root
   - 确保容器本身的安全性

---

## 📞 需要协助？

如果需要进一步帮助，请提供：
1. 宿主机访问权限（用于永久修复）
2. OpenClaw 容器启动配置（docker-compose 或 docker run 命令）
3. 是否需要自动化修复脚本

---

*报告生成：IT-Team Agent*
