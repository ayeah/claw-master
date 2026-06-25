# claw-master 开发计划

## 项目概览

claw-master 是一个 **AI 军团控制台**，面向 OPC（One Person Company）打造。

**双层架构：**
- **claw-master-client** — 本地客户端（Electron 桌面应用），核心层
- **claw-master-server** — 服务器端（FastAPI 后端），增值层

---

## 技术选型

### claw-master-client

| 模块 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Electron + electron-vite | 参考 cherry-studio |
| UI | React + TypeScript + Tailwind CSS + Shadcn UI | 快速出界面 |
| 状态管理 | Zustand | 轻量，MVP 阶段够用 |
| 数据库 | SQLite + Drizzle ORM | 本地会话/配置/记忆 |
| AI 核心 | Vercel AI SDK | 统一模型调用，流式输出 |
| 向量库 | Chroma（嵌入式） | 本地记忆检索 |
| WebSocket | socket.io-client | 与服务器端通信 |
| IPC | Electron contextBridge | 主进程/渲染进程通信 |
| 测试 | Vitest | 单元/集成测试 |
| Lint/Format | ESLint + Biome | 代码质量 |
| i18n | i18next | 多语言 |

### claw-master-server

| 模块 | 技术 | 说明 |
|------|------|------|
| 框架 | FastAPI (Python) | 开发快、异步、自动文档 |
| 数据库 | PostgreSQL + SQLAlchemy + Alembic | 会话/记忆/审计 |
| 向量库 | Qdrant | 统一记忆库 |
| 文件存储 | MinIO (S3 兼容) | 云端文件系统 |
| 认证 | JWT + 设备密钥 | 双端认证 |
| 通信 | WebSocket + REST API | 实时同步 |
| 测试 | pytest + httpx | 接口测试 |
| 部署 | Docker Compose | 一键部署 |

---

## 开发阶段

### 第一阶段：本地客户端 MVP（Week 1-2）

> 目标：可独立运行的 AI 对话工具

#### P0-1: 项目脚手架
- [✅] electron-vite + React + TypeScript 初始化
- [✅] Tailwind CSS 配置
- [✅] 目录结构搭建

#### P0-2: 模型商配置（Provider Manager）
- [✅] Provider 数据模型（TypeScript 类型定义）
- [✅] SQLite 数据库初始化
- [✅] Provider CRUD API（本地 IPC）
- [✅] Provider 配置 UI 页面
- [✅] 获取模型列表功能（从 API）
- [✅] 手动添加模型 ID 功能

#### P0-3: 多模型对话（Chat Engine）
- [✅] 会话数据模型
- [✅] 消息数据模型（role, content, toolCalls）
- [✅] 多会话并行管理
- [✅] 会话绑定模型
- [✅] 流式输出渲染
- [✅] 会话克隆功能
- [✅] 切换模型功能

#### P0-4: 基础 UI
- [✅] 侧边栏（会话列表）
- [✅] 聊天主界面
- [✅] 模型选择器
- [✅] 设置页面（Provider 配置）
- [⚠️] 暗色/亮色主题（待完善）

---

### 第二阶段：本地客户端增强（Week 3）

> 目标：支持远程 Agent 和执行能力

#### P1-1: WSL/SSH 执行桥（Execution Bridge）
- [✅] WSL 发行版自动检测
- [✅] WSL 命令执行接口
- [✅] SSH 连接管理（host/port/user/key）
- [✅] SSH 命令执行
- [✅] 文件上传/下载
- [✅] 命令白名单安全策略
- [✅] 执行日志记录

#### P1-2: OpenClaw/Hermes Agent 连接
- [✅] AgentProvider 接口定义
- [✅] Agent 列表拉取
- [✅] Agent 调用接口
- [✅] 本地/远程 Agent 统一抽象

#### P1-3: 一键 Docker 部署
- [✅] Docker 环境检测
- [✅] .env 配置生成
- [✅] docker-compose.yml 模板
- [✅] 一键启动/停止/状态查询
- [✅] 自动写入本地配置

---

### 第三阶段：多 Agent 协作（Week 4）

> 目标：Agent 编排能力

#### P2-1: 多 Agent 切换
- [✅] 会话绑定 Agent
- [✅] Agent 下拉切换 UI
- [✅] 本地/远程 Agent 混用

#### P2-2: 多 Agent 协作（Orchestrator）
- [✅] 串行流水线模式
- [✅] 并行任务模式
- [✅] 汇总 Agent 模式
- [✅] 任务拆解引擎
- [✅] 依赖调度器
- [✅] 中间结果存储

#### P2-3: Skill / 记忆 / 文件
- [✅] Skill 管理（JSON Schema 定义）
- [✅] Skill 执行（本地函数 / HTTP / Shell）
- [✅] 会话记忆（短期）
- [✅] 长期记忆（向量库）
- [✅] 记忆可视化编辑
- [✅] 项目文件夹管理
- [✅] 文件自动摘要
- [✅] 文件分片 + 向量化

---

### 第四阶段：服务器端 MVP（Week 4-5）

> 目标：云端同步能力

#### P3-1: 服务端脚手架
- [✅] FastAPI 项目初始化
- [✅] PostgreSQL 数据库配置
- [✅] Alembic 迁移管理
- [✅] 项目目录结构搭建
- [✅] pytest 测试框架配置

#### P3-2: 认证系统
- [✅] 用户注册/登录
- [✅] JWT Token 签发/验证
- [✅] 设备注册/管理
- [✅] 设备密钥认证

#### P3-3: 会话同步 API
- [✅] 会话 CRUD API
- [✅] 消息 CRUD API
- [✅] 增量同步接口
- [✅] 冲突解决策略

#### P3-4: WebSocket 实时通信
- [✅] WebSocket 连接管理
- [✅] 心跳机制
- [✅] 消息推送
- [✅] 在线状态管理

---

### 第五阶段：云端增强（Week 5-6）

> 目标：完整云端能力

#### P4-1: 统一记忆库
- [✅] Qdrant 向量库集成
- [✅] 记忆存储/检索 API
- [✅] 多设备共享
- [✅] 权限控制

#### P4-2: 云端文件系统
- [✅] MinIO 文件上传/下载
- [✅] 版本管理
- [✅] 向量化索引
- [✅] 项目空间管理

#### P4-3: 远程访问
- [✅] 远程任务下发
- [✅] 本地客户端执行转发
- [✅] 任务进度查询
- [✅] 远程触发部署

#### P4-4: Mobile API
- [✅] 移动端认证接口
- [✅] 简化版会话 API
- [✅] 任务状态推送

---

### 第六阶段：联调与发布（Week 6）

- [ ] Client ↔ Server 联调
- [ ] 多平台打包（Windows / macOS / Linux）
- [ ] 自动更新机制
- [ ] 安装包签名
- [ ] 首版发布

---

## 里程碑

| 里程碑 | 时间 | 交付物 |
|--------|------|--------|
| M1: 客户端可用 | Week 2 | ✅ 可对话的桌面应用 |
| M2: 执行能力 | Week 3 | 待开发 |
| M3: Agent 协作 | Week 4 | 待开发 |
| M4: 云端同步 | Week 5 | 待开发 |
| M5: 正式发布 | Week 6 | 待开发 |

---

## 目录结构

### claw-master-client

```
claw-master-client/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── vitest.config.ts
├── .eslintrc.cjs
├── biome.json
├── resources/                    # 应用图标等资源
│   ├── icon.ico
│   ├── icon.icns
│   └── icon.png
├── src/
│   ├── main/                     # Electron 主进程
│   │   ├── index.ts              # 主进程入口
│   │   ├── ipc.ts                # IPC 注册
│   │   ├── preload/
│   │   │   └── index.ts          # contextBridge
│   │   ├── core/
│   │   │   ├── application/      # 应用生命周期
│   │   │   ├── window/           # 窗口管理
│   │   │   ├── paths/            # 路径管理
│   │   │   └── scheduler/        # 定时任务
│   │   ├── features/
│   │   │   ├── provider/         # 模型商管理
│   │   │   │   ├── provider.service.ts
│   │   │   │   ├── provider.handler.ts
│   │   │   │   └── provider.types.ts
│   │   │   ├── chat/             # 对话引擎
│   │   │   │   ├── chat.service.ts
│   │   │   │   ├── chat.handler.ts
│   │   │   │   └── chat.types.ts
│   │   │   ├── agent/            # Agent 管理
│   │   │   │   ├── agent.service.ts
│   │   │   │   ├── agent.handler.ts
│   │   │   │   └── agent.types.ts
│   │   │   ├── execution/        # WSL/SSH/Docker 执行
│   │   │   │   ├── wsl.service.ts
│   │   │   │   ├── ssh.service.ts
│   │   │   │   ├── docker.service.ts
│   │   │   │   └── execution.types.ts
│   │   │   ├── skill/            # 技能系统
│   │   │   ├── memory/           # 记忆引擎
│   │   │   └── file/             # 文件管理
│   │   ├── data/
│   │   │   ├── db/
│   │   │   │   ├── index.ts      # 数据库初始化
│   │   │   │   ├── schemas/      # Drizzle 表结构
│   │   │   │   └── migrations/   # 数据库迁移
│   │   │   └── cache/            # 缓存管理
│   │   └── shared/
│   │       ├── constants.ts
│   │       └── types.ts
│   ├── renderer/                 # Electron 渲染进程（React）
│   │   ├── index.html
│   │   ├── main.tsx              # React 入口
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Chat/             # 聊天页面
│   │   │   │   ├── index.tsx
│   │   │   │   ├── ChatSidebar.tsx
│   │   │   │   └── MessageList.tsx
│   │   │   ├── Settings/         # 设置页面
│   │   │   │   ├── index.tsx
│   │   │   │   ├── ProviderConfig.tsx
│   │   │   │   └── AgentConfig.tsx
│   │   │   └── Agent/            # Agent 管理页面
│   │   ├── components/
│   │   │   ├── ui/               # Shadcn UI 组件
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ModelSelector.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── hooks/
│   │   │   ├── useChat.ts
│   │   │   ├── useProvider.ts
│   │   │   └── useAgent.ts
│   │   ├── stores/
│   │   │   ├── chatStore.ts      # Zustand
│   │   │   ├── providerStore.ts
│   │   │   └── agentStore.ts
│   │   ├── i18n/
│   │   │   ├── index.ts
│   │   │   ├── en.json
│   │   │   └── zh.json
│   │   ├── styles/
│   │   │   └── globals.css
│   │   └── lib/
│   │       └── utils.ts
│   └── shared/                   # 主进程/渲染进程共享
│       ├── ipc-channels.ts
│       └── types.ts
├── tests/
│   ├── mocks/
│   └── unit/
└── scripts/
    └── build.ts
```

### claw-master-server

```
claw-master-server/
├── pyproject.toml
├── requirements.txt
├── alembic.ini
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── README.md
├── alembic/
│   ├── env.py
│   └── versions/
├── app/
│   ├── __init__.py
│   ├── main.py                   # FastAPI 入口
│   ├── config.py                 # 配置管理
│   ├── database.py               # 数据库连接
│   ├── dependencies.py           # 依赖注入
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py         # API 路由汇总
│   │   │   ├── auth.py           # 认证接口
│   │   │   ├── sessions.py       # 会话同步
│   │   │   ├── messages.py       # 消息同步
│   │   │   ├── providers.py      # 模型商配置同步
│   │   │   ├── memory.py         # 记忆管理
│   │   │   ├── files.py          # 文件管理
│   │   │   └── remote.py         # 远程访问
│   │   └── websocket/
│   │       ├── __init__.py
│   │       ├── manager.py        # WebSocket 连接管理
│   │       └── handlers.py       # WebSocket 消息处理
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py               # 用户模型
│   │   ├── device.py             # 设备模型
│   │   ├── session.py            # 会话模型
│   │   ├── message.py            # 消息模型
│   │   ├── provider.py           # 模型商配置模型
│   │   ├── memory.py             # 记忆模型
│   │   └── file.py               # 文件模型
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py               # 认证 Schema
│   │   ├── session.py            # 会话 Schema
│   │   ├── message.py            # 消息 Schema
│   │   ├── provider.py           # 模型商 Schema
│   │   ├── memory.py             # 记忆 Schema
│   │   └── file.py               # 文件 Schema
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py       # 认证服务
│   │   ├── session_service.py    # 会话服务
│   │   ├── message_service.py    # 消息服务
│   │   ├── sync_service.py       # 同步服务
│   │   ├── memory_service.py     # 记忆服务
│   │   ├── file_service.py       # 文件服务
│   │   └── vector_service.py     # 向量服务
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py           # JWT / 加密
│   │   ├── exceptions.py         # 自定义异常
│   │   └── middleware.py         # 中间件
│   └── utils/
│       ├── __init__.py
│       └── helpers.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_sessions.py
│   ├── test_messages.py
│   └── test_memory.py
└── scripts/
    ├── init_db.py
    └── seed_data.py
```

---

## 依赖清单

### claw-master-client (package.json 核心依赖)

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "electron": "^33.0.0",
    "electron-vite": "^2.3.0",
    "drizzle-orm": "^0.36.0",
    "better-sqlite3": "^11.0.0",
    "zustand": "^5.0.0",
    "ai": "^4.0.0",
    "openai": "^4.0.0",
    "socket.io-client": "^4.8.0",
    "i18next": "^24.0.0",
    "react-i18next": "^15.0.0",
    "tailwindcss": "^4.0.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0",
    "eslint": "^9.0.0",
    "@biomejs/biome": "^1.9.0",
    "drizzle-kit": "^0.28.0"
  }
}
```

### claw-master-server (pyproject.toml 核心依赖)

```toml
[project]
name = "claw-master-server"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    "pydantic>=2.10.0",
    "pydantic-settings>=2.6.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "python-multipart>=0.0.12",
    "httpx>=0.28.0",
    "websockets>=14.0",
    "qdrant-client>=1.12.0",
    "minio>=7.2.0",
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.28.0",
]
```
