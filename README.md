# Claw Master

<p align="center">
  <a href="https://github.com/claw-master/claw-master/releases">
    <img src="https://img.shields.io/github/v/release/claw-master/claw-master" alt="Release" />
  </a>
  <img src="https://img.shields.io/github/license/claw-master/claw-master" alt="License" />
  <img src="https://img.shields.io/github/contributors/claw-master/claw-master" alt="Contributors" />
</p>

## 简介

Claw Master 是一款面向 **OPC（一人公司）** 的 **AI 军团控制台**，让个人创作者、独立开发者和自由职业者能够用一套工具统一调度多模型、多 Agent 与本地/云端资源。

产品采用「本地核心 + 云端增值」双层架构：

- **claw-master-client**：本地桌面客户端，所有核心对话、Agent 协作与执行能力都在本地运行。
- **claw-master-server**：可选的云服务后端，提供跨设备同步、统一记忆库与远程访问能力。

## 功能特性

### 本地客户端

- **多模型商支持**：OpenAI、Anthropic、Google、Azure 以及自定义 API。
- **多模型对话**：实时流式输出、多会话并行、会话克隆与模型切换。
- **多 Agent 协作**：本地/远程 Agent 自由切换，支持串行、并行与汇总模式。
- **执行能力**：WSL/SSH 远程执行、Docker 一键部署。
- **记忆系统**：会话短期记忆 + 长期向量记忆，支持可视化编辑。
- **技能系统**：可扩展的 JSON Schema 技能定义与执行。
- **文件管理**：项目文件夹、自动摘要、分片向量化。
- **跨平台**：Windows / macOS / Linux。

### 服务端（可选）

- **云端同步**：会话、配置、记忆跨设备同步。
- **统一记忆库**：Qdrant 向量存储，多设备共享。
- **远程访问**：手机远程触发任务、查看进度。
- **文件云盘**：MinIO 存储、版本管理、向量化索引。

## 快速开始

### 下载安装

1. 前往 [Releases](https://github.com/claw-master/claw-master/releases) 页面。
2. 下载对应平台的安装包。
3. 安装并启动 Claw Master。

### 首次使用

1. 打开「设置」页面，添加你常用的模型商 API Key。
2. 返回「对话」页面，选择模型并开始聊天。
3. 在「Agent」页面配置或连接本地/远程 Agent，即可让多个 Agent 协同工作。

### 服务端部署（可选）

如需跨设备同步，可在服务器上部署 claw-master-server：

```bash
cd claw-master-server
docker compose up -d
```

部署完成后，在客户端设置中填写服务端地址即可启用云端能力。

## 许可证

MIT License - 详见 [LICENSE](LICENSE)
