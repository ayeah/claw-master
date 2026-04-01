# Claw Master

🛠️ OpenClaw 管理系统 - API Gateway & 用户权限管理

---

## 📖 简介

Claw Master 是一个功能完整的 OpenClaw 管理系统，提供：

- **用户权限管理** - 完整的 RBAC 权限模型
- **组织架构管理** - 多级部门层级支持
- **API Gateway** - 多模型提供商统一接入
- **Docker 部署** - 一键容器化部署

---

## 🚀 快速开始

### 查看文档

- 📘 [模块说明](docs/MODULES.md) - 系统模块介绍
- 📗 [用户管理](docs/USER_MANAGEMENT.md) - 用户权限模块文档
- 📙 [API Gateway](docs/API_GATEWAY_MODULE.md) - API 网关模块文档
- 📕 [部署指南](docs/DEPLOYMENT.md) - 详细部署步骤
- 📔 [快速开始](docs/QUICKSTART.md) - 5 分钟快速上手

### 部署系统

```bash
# 1. 克隆仓库
git clone https://github.com/ayeah/claw-master.git
cd claw-master

# 2. 使用部署工具
python3 tools/build-and-deploy.py

# 或使用 Docker 部署
python3 tools/deploy-docker.py
```

---

## 📁 项目结构

```
claw-master/
├── README.md              # 本文件
├── LICENSE                # MIT License
├── .gitignore             # Git 忽略配置
├── Dockerfile             # Docker 镜像构建
├── .dockerignore          # Docker 忽略配置
├── package.json           # Node.js 项目配置
│
├── docs/                  # 📚 文档目录
│   ├── MODULES.md                    # 模块说明
│   ├── USER_MANAGEMENT.md            # 用户管理文档
│   ├── API_GATEWAY_MODULE.md         # API Gateway 文档
│   ├── DEPLOYMENT.md                 # 部署指南
│   ├── QUICKSTART.md                 # 快速开始
│   └── GITHUB_CLEANUP_REPORT.md      # 仓库清理报告
│
├── tools/                 # 🛠️ 工具脚本
│   ├── build-and-deploy.py           # 构建和部署
│   ├── deploy-docker.py              # Docker 部署
│   ├── deploy-docker.sh              # Docker 部署 (Shell)
│   ├── deploy-to-github.sh           # GitHub 推送
│   └── init_database.js              # 数据库初始化
│
├── backend/               # 🐍 后端代码
│   ├── api/                           # API 路由
│   ├── services/                      # 业务服务
│   ├── models/                        # 数据模型
│   ├── config/                        # 配置文件
│   ├── db.py                          # 数据库连接
│   ├── main.py                        # 主应用
│   └── requirements.txt               # Python 依赖
│
├── frontend/              # 🌐 前端代码
│   ├── templates/                     # HTML 模板
│   └── static/                        # 静态资源
│
└── database/              # 🗄️ 数据库脚本
    ├── init.sql                       # 初始化脚本
    ├── 02_organization.sql            # 组织架构扩展
    └── 03_api_gateway.sql             # API Gateway 扩展
```

---

## 🎯 核心功能

### 1. 用户权限管理 ✅

- 用户 CRUD 操作
- 角色管理（RBAC）
- 权限控制
- 会话管理
- 登录日志

### 2. 组织架构管理 ✅

- 多级部门层级
- 用户部门关联
- 部门统计视图
- 软删除支持

### 3. API Gateway 🚧

- 多提供商支持（OpenAI, Claude, Gemini 等）
- API Key 管理
- 请求中转
- 配额管理
- 限流控制
- 负载均衡

---

## 🛠️ 技术栈

**后端：**
- Python 3.11+
- aiohttp (异步 Web 框架)
- asyncpg (PostgreSQL 驱动)
- bcrypt (密码哈希)

**前端：**
- HTML5 / CSS3 / JavaScript
- 原生实现（无框架依赖）

**数据库：**
- PostgreSQL 17+
- UUID 主键
- 软删除机制

**部署：**
- Docker & Docker Compose
- Nginx (反向代理)
- 支持 Kubernetes

---

## 📦 部署方式

### Docker 部署（推荐）

```bash
# 一键部署
python3 tools/deploy-docker.py

# 或手动部署
docker build -t claw-master .
docker run -d -p 8080:80 claw-master
```

### 源码部署

```bash
# 安装依赖
pip install -r backend/requirements.txt

# 初始化数据库
node tools/init_database.js

# 启动服务
python3 backend/main.py
```

详细部署步骤请查看：[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 🔧 工具脚本

| 脚本 | 说明 |
|------|------|
| `tools/build-and-deploy.py` | 构建和部署一体化脚本 |
| `tools/deploy-docker.py` | Docker 容器部署 |
| `tools/deploy-docker.sh` | Docker 部署 (Shell 版本) |
| `tools/init_database.js` | 数据库初始化 |
| `tools/deploy-to-github.sh` | 推送到 GitHub |

---

## 📝 开发进度

### 已完成 ✅

- [x] 用户管理模块（P0）
- [x] 角色权限模块（P0）
- [x] 组织架构模块（P1）
- [x] 数据库表结构（v0.4.0）
- [x] API Gateway 基础架构

### 进行中 🚧

- [ ] API Gateway 请求中转
- [ ] 计费服务
- [ ] 限流增强

### 计划中 📋

- [ ] 熔断机制
- [ ] 监控仪表盘
- [ ] 批量操作

详细进度请查看开发文档。

---

## 🔐 安全提示

**请勿将以下信息提交到仓库：**

- ❌ 数据库凭证
- ❌ API 密钥
- ❌ SSH 私钥
- ❌ 环境变量文件

所有敏感信息请使用环境变量或配置文件管理。

---

## 📄 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 📞 联系方式

- 📧 Email: admin@openclaw.local
- 🌐 GitHub: https://github.com/ayeah/claw-master

---

*Last updated: 2026-04-01*
