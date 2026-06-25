# Claw Master

<p align="center">
  <img src="build/icon.png" width="150" height="150" alt="Claw Master Logo" />
</p>

<p align="center">
  <a href="https://github.com/claw-master/claw-master/releases">
    <img src="https://img.shields.io/github/v/release/claw-master/claw-master" alt="Release" />
  </a>
  <img src="https://img.shields.io/github/license/claw-master/claw-master" alt="License" />
  <img src="https://img.shields.io/github/contributors/claw-master/claw-master" alt="Contributors" />
</p>

> English | [简体中文](./README.zh-CN.md)

## 概述

Claw Master 是一个面向 OPC（一人公司）的 **AI 军团控制台**，支持多模型商、多 Agent 协作、本地与云端双层架构。

## 特性

### 本地客户端（核心功能）

- **多模型商支持**：OpenAI、Anthropic、Google、Azure、自定义 API
- **多模型对话**：实时流式输出、会话管理、多会话并行
- **多 Agent 协作**：支持本地/远程 Agent 切换、串行/并行/汇总模式
- **执行能力**：WSL/SSH 远程执行、Docker 一键部署
- **记忆系统**：会话记忆 + 长期记忆（向量库）
- **技能系统**：可扩展的技能定义与执行
- **文件管理**：项目文件夹、自动摘要、分片向量化
- **跨平台**：Windows / macOS / Linux

### 服务器端（增值能力）

- **云端同步**：会话、配置、记忆跨设备同步
- **统一记忆库**：Qdrant 向量存储、多设备共享
- **远程访问**：手机远程触发任务、查看进度
- **文件云盘**：MinIO 存储、版本管理、向量化索引

## 快速开始

### 安装

从 [Releases](https://github.com/claw-master/claw-master/releases) 下载对应平台的安装包。

### 开发

```bash
# 克隆仓库
git clone https://github.com/claw-master/claw-master.git
cd claw-master

# 安装客户端依赖
cd claw-master-client
npm install
npm run dev

# 安装服务端依赖（可选）
cd ../claw-master-server
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 项目结构

```
claw-master/
├── claw-master-client/     # Electron 桌面客户端
│   ├── src/
│   │   ├── main/          # 主进程
│   │   │   ├── features/  # 业务功能模块
│   │   │   │   ├── provider/   # 模型商管理
│   │   │   │   ├── chat/       # 对话引擎
│   │   │   │   ├── agent/      # Agent 管理
│   │   │   │   └── execution/  # 执行桥
│   │   │   └── data/           # 数据层
│   │   ├── renderer/          # React UI
│   │   │   ├── pages/         # 页面组件
│   │   │   ├── components/    # UI 组件
│   │   │   └── stores/        # Zustand 状态
│   │   └── shared/            # 共享类型
│   ├── package.json
│   └── electron.vite.config.ts
│
├── claw-master-server/    # FastAPI 后端服务
│   ├── app/
│   │   ├── api/          # REST API
│   │   ├── models/       # SQLAlchemy 模型
│   │   ├── schemas/      # Pydantic Schema
│   │   └── services/     # 业务逻辑
│   ├── pyproject.toml
│   └── docker-compose.yml
│
└── docs/                  # 文档
```

## 文档

### 开发指南

| 文档 | 描述 |
|------|------|
| [CLAUDE.md](./claw-master-client/CLAUDE.md) | 开发者指南 — 开发规范、测试、Lint、提交约定 |
| [CONTRIBUTING.md](./claw-master-client/CONTRIBUTING.md) | 贡献指南 — 如何贡献代码、PR 流程 |
| [DESIGN.md](./claw-master-client/DESIGN.md) | 设计系统 — UI 设计规范、组件样式 |
| [electron-builder.yml](./claw-master-client/electron-builder.yml) | 构建配置 — 打包配置（Windows/macOS/Linux） |

### 相关文档

- [DEV-PLAN.md](./DEV-PLAN.md) — 开发计划（内部策划）
- [claw-master 开发文档（双层架构版）.md](./claw-master%20开发文档（双层架构版）.md) — 原始需求文档

## 技术栈

### 客户端

| 模块 | 技术 |
|------|------|
| 桌面框架 | Electron + electron-vite |
| UI | React 19 + Tailwind CSS + Shadcn UI |
| 状态管理 | Zustand |
| 数据库 | SQLite + Drizzle ORM |
| AI 核心 | Vercel AI SDK |
| 构建 | electron-builder |

### 服务端

| 模块 | 技术 |
|------|------|
| 框架 | FastAPI |
| 数据库 | PostgreSQL + SQLAlchemy |
| 向量库 | Qdrant |
| 文件存储 | MinIO |

## 路线图

- [x] P0: 基础对话功能（模型商配置 + 多会话 + 流式输出）
- [ ] P1: WSL/SSH 执行桥 + Docker 部署
- [ ] P2: 多 Agent 协作 + Skill/记忆系统
- [ ] P3: 服务端 MVP（认证 + 会话同步）
- [ ] P4: 云端增强（统一记忆库 + 远程访问）

## 贡献

欢迎贡献代码！请阅读 [CONTRIBUTING.md](./claw-master-client/CONTRIBUTING.md) 了解贡献流程，[CLAUDE.md](./claw-master-client/CLAUDE.md) 了解开发规范。

## 许可证

MIT License - 详见 [LICENSE](LICENSE)

## 相关项目

- [cherry-studio](https://github.com/CherryHQ/cherry-studio) — AI 生产力工具，本项目的参考对象
- [one-api](https://github.com/songquanpeng/one-api) — LLM API 管理与分发系统

---

<p align="center">
  用 <a href="https://github.com/claw-master/claw-master">⭐️</a> 支持我们
</p>