# GitHub Deploy Key 配置指南

**生成时间：** 2026-03-31  
**用途：** 自动化代码推送至 GitHub

---

## 🔑 Deploy Key 信息

### 密钥对位置

| 文件 | 路径 | 说明 |
|------|------|------|
| **私钥** | `/home/node/.openclaw/agents/it-team/workspace/github_deploy_key` | 用于认证（保密） |
| **公钥** | `/home/node/.openclaw/agents/it-team/workspace/github_deploy_key.pub` | 配置到 GitHub |

### 公钥内容

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINibyK+0OCwbERTFkjHoSR9DS5Unyx08AVqdDd0iWGuz claw-master-deploy-key
```

### 密钥指纹

```
SHA256:JENH/V0cpkVaXvPn+mcIAz50XTnaAk8ljI7o57oI9II
```

---

## 📋 配置步骤

### 步骤 1：添加 Deploy Key 到 GitHub

1. 打开 GitHub 仓库页面
2. 进入 **Settings** → **Deploy keys**
3. 点击 **Add deploy key**
4. 填写信息：
   - **Title**: `claw-master-deploy-key`
   - **Key**: 粘贴上面的公钥内容
   - ✅ **Allow write access**（必须勾选，否则无法推送）
5. 点击 **Add key**

![Add Deploy Key](https://docs.github.com/assets/cb-73038/images/help/repository/deploy-keys-add.png)

### 步骤 2：验证连接

```bash
# 测试 SSH 连接
ssh -i /home/node/.openclaw/agents/it-team/workspace/github_deploy_key \
    -T git@github.com
```

成功输出：
```
Hi username/repo! You've successfully authenticated, but GitHub does not provide shell access.
```

### 步骤 3：配置推送脚本

编辑快速部署脚本，设置仓库地址：

```bash
# 方式一：设置环境变量
export GITHUB_REPO=git@github.com:username/repo.git

# 方式二：直接运行
GITHUB_REPO=git@github.com:username/repo.git ./github-deploy-quick.sh
```

---

## 🚀 使用方法

### 方式一：快速部署（推荐）

```bash
# 设置仓库地址
export GITHUB_REPO=git@github.com:username/repo.git

# 执行推送
./github-deploy-quick.sh
```

### 方式二：完整部署脚本

```bash
# 基本用法
./deploy-to-github.sh -r git@github.com:username/repo.git

# 指定分支
./deploy-to-github.sh -r git@github.com:username/repo.git -b develop

# 指定提交信息
./deploy-to-github.sh -r git@github.com:username/repo.git \
    -m "feat: 新增用户管理功能"

# 指定源代码目录
./deploy-to-github.sh -r git@github.com:username/repo.git \
    -s /path/to/source/code

# 仅检查配置
./deploy-to-github.sh -r git@github.com:username/repo.git -c
```

### 方式三：手动推送

```bash
# 1. 配置 SSH
export GIT_SSH_COMMAND="ssh -i /home/node/.openclaw/agents/it-team/workspace/github_deploy_key"

# 2. 初始化 Git（如需要）
cd /path/to/your/code
git init

# 3. 添加远程仓库
git remote add origin git@github.com:username/repo.git

# 4. 添加并提交
git add -A
git commit -m "your commit message"

# 5. 推送
git push -u origin main
```

---

## 📁 文件结构

```
/home/node/.openclaw/agents/it-team/workspace/
├── github_deploy_key          # Deploy Key 私钥
├── github_deploy_key.pub      # Deploy Key 公钥
├── deploy-to-github.sh        # 完整部署脚本
├── github-deploy-quick.sh     # 快速部署脚本
└── GITHUB_DEPLOY.md           # 本文档
```

---

## 🔄 自动化推送流程

### 场景 1：开发完成后推送

```bash
# 1. 完成开发
# 2. 运行测试
npm test  # 或其他测试命令

# 3. 推送到 GitHub
cd /home/node/.openclaw/agents/it-team/workspace
GITHUB_REPO=git@github.com:username/repo.git ./github-deploy-quick.sh
```

### 场景 2：CI/CD 集成

在 CI/CD 脚本中添加：

```bash
#!/bin/bash
# CI/CD 部署脚本

# 运行测试
npm test

# 如果测试通过，推送到 GitHub
if [ $? -eq 0 ]; then
    export GITHUB_REPO=git@github.com:username/repo.git
    export BRANCH_NAME=main
    ./github-deploy-quick.sh
else
    echo "测试失败，跳过推送"
    exit 1
fi
```

### 场景 3：定时推送

```bash
# 添加到 crontab，每天凌晨 2 点推送
0 2 * * * cd /home/node/.openclaw/agents/it-team/workspace && GITHUB_REPO=git@github.com:username/repo.git ./github-deploy-quick.sh
```

---

## 🔐 安全建议

### 1. 保护私钥

```bash
# 确保私钥权限正确
chmod 600 /home/node/.openclaw/agents/it-team/workspace/github_deploy_key

# 不要将私钥提交到 Git
echo "github_deploy_key" >> .gitignore
echo "github_deploy_key.pub" >> .gitignore  # 建议也不提交公钥
```

### 2. 限制 Deploy Key 权限

- ✅ 只授予必要的仓库访问权限
- ✅ 启用 "Allow write access" 仅当需要推送时
- ✅ 定期轮换密钥

### 3. 监控密钥使用

在 GitHub 仓库的 **Settings** → **Deploy keys** 查看：
- 密钥最后使用时间
- 密钥访问记录

---

## 🔍 故障排查

### 问题 1：权限被拒绝（Permission denied）

**症状：**
```
git@github.com: Permission denied (publickey).
```

**解决方案：**
1. 确认 Deploy Key 已添加到 GitHub
2. 确认勾选了 "Allow write access"
3. 检查私钥权限：`chmod 600 github_deploy_key`
4. 测试连接：`ssh -i github_deploy_key -T git@github.com`

### 问题 2：仓库不存在

**症状：**
```
ERROR: Repository not found.
```

**解决方案：**
1. 检查仓库地址是否正确
2. 确认仓库存在且为公开，或 Deploy Key 有访问权限
3. 格式应为：`git@github.com:username/repo.git`

### 问题 3：分支不存在

**症状：**
```
error: src refspec main does not match any
```

**解决方案：**
```bash
# 创建并推送新分支
git checkout -b main
git push -u origin main
```

### 问题 4：冲突

**症状：**
```
! [rejected] main -> main (fetch first)
```

**解决方案：**
```bash
# 先拉取远程变更
git pull --rebase origin main

# 解决冲突后推送
git push -u origin main
```

---

## 📞 常用命令速查

```bash
# 生成新的 Deploy Key
ssh-keygen -t ed25519 -C "deploy-key" -f github_deploy_key -N ""

# 查看公钥
cat github_deploy_key.pub

# 测试 GitHub 连接
ssh -i github_deploy_key -T git@github.com

# 快速推送
GITHUB_REPO=git@github.com:username/repo.git ./github-deploy-quick.sh

# 完整推送（带参数）
./deploy-to-github.sh -r git@github.com:username/repo.git -b main -m "feat: xxx"

# 检查配置
./deploy-to-github.sh -r git@github.com:username/repo.git -c
```

---

## 🔗 相关资源

- [GitHub Deploy Keys 官方文档](https://docs.github.com/en/developers/overview/managing-deploy-keys#deploy-keys)
- [SSH Key 生成指南](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
- [Git 推送最佳实践](https://docs.github.com/en/get-started/using-git/pushing-commits-to-a-remote-repository)

---

*文档生成：IT-Team Agent*
