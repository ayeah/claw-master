# OpenClaw IT-Team Workspace

🛠️ IT 运维与技术支持助手的工作空间

---

## 📋 项目简介

这是 OpenClaw IT-Team Agent 的工作空间，用于：

- 🖥️ 系统监控和维护
- 📝 技术文档管理
- 🔧 故障排除和问题解决
- 🤖 IT 任务自动化
- 📚 知识库管理

---

## 🚀 快速开始

### 部署 Docker 容器

```bash
# 使用默认配置部署
python3 deploy-docker.py

# 指定版本部署
python3 deploy-docker.py -v 2026.3.28

# 查看帮助
python3 deploy-docker.py --help
```

### 推送代码到 GitHub

```bash
# 设置仓库地址
export GITHUB_REPO=git@github.com:username/repo.git

# 快速推送
./github-deploy-quick.sh

# 完整推送（带参数）
./deploy-to-github.sh -r git@github.com:username/repo.git -m "feat: 新功能"
```

---

## 📁 目录结构

```
workspace/
├── .gitignore              # Git 忽略配置
├── .env.extra.example      # 环境变量示例
├── README.md               # 项目说明
├── AGENTS.md               # Agent 配置
├── SOUL.md                 # Agent 人格定义
├── USER.md                 # 用户信息
├── IDENTITY.md             # 身份定义
├── TOOLS.md                # 工具配置
├── HEARTBEAT.md            # 心跳任务配置
│
├── deploy-docker.py        # Docker 部署脚本（Python）
├── deploy-docker.sh        # Docker 部署脚本（Shell）
├── deploy-to-github.sh     # GitHub 推送脚本（完整）
├── github-deploy-quick.sh  # GitHub 推送脚本（快速）
│
├── docker_container_viewer.py  # Docker 容器查看工具
├── docker_containers_report.md # 容器报告
├── docker_socket_analysis.md   # Socket 分析
│
├── DEPLOY.md               # 部署文档
├── GITHUB_DEPLOY.md        # GitHub 配置文档
├── deploy-quickstart.md    # 快速入门
│
├── memory/                 # 记忆目录
│   └── YYYY-MM-DD.md       # 每日记忆
│
└── venv/                   # Python 虚拟环境（不提交）
```

---

## 🛠️ 可用工具

### Docker 管理

| 工具 | 说明 |
|------|------|
| `deploy-docker.py` | Python 版 Docker 部署脚本 |
| `deploy-docker.sh` | Shell 版 Docker 部署脚本 |
| `docker_container_viewer.py` | Docker 容器查看工具 |

### GitHub 推送

| 工具 | 说明 |
|------|------|
| `deploy-to-github.sh` | 完整 GitHub 推送脚本 |
| `github-deploy-quick.sh` | 快速 GitHub 推送脚本 |

---

## 📖 文档

| 文档 | 说明 |
|------|------|
| `DEPLOY.md` | Docker 部署完整指南 |
| `GITHUB_DEPLOY.md` | GitHub Deploy Key 配置指南 |
| `deploy-quickstart.md` | 快速入门指南 |

---

## 🔐 安全配置

### Deploy Key

本项目使用 GitHub Deploy Key 进行代码推送认证。

**配置步骤：**
1. 将 `github_deploy_key.pub` 内容添加到 GitHub 仓库
2. 进入 Settings → Deploy keys → Add deploy key
3. ✅ 勾选 "Allow write access"

**详细信息：** 参见 [GITHUB_DEPLOY.md](./GITHUB_DEPLOY.md)

---

## 🧪 开发工作流

```
1. 本地开发 → 2. 运行测试 → 3. 推送到 GitHub → 4. 部署到容器
```

### 推送代码

```bash
# 1. 完成开发后
cd /home/node/.openclaw/agents/it-team/workspace

# 2. 设置仓库地址
export GITHUB_REPO=git@github.com:username/repo.git

# 3. 推送代码
./github-deploy-quick.sh
```

### 部署更新

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新部署容器
python3 deploy-docker.py -v 2026.3.28 -r
```

---

## 📞 支持

- 📧 问题反馈：提交 Issue
- 📚 文档：查看各 `.md` 文件
- 🛠️ 工具帮助：运行 `脚本名 --help`

---

## 📄 许可证

内部项目，仅供组织内部使用。

---

*最后更新：2026-03-31*  
*维护者：IT-Team Agent*
