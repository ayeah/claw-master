# Claw Master 开发指南

## 开发原则

### 思维方式

#### 先想再做

- 明确说明假设。如有不确定，先问再做。
- 存在多种解释时，先提出方案供选择，不要默默选择。
- 如果有更简单的解决方案，请指出。
- 如果有不明确之处，停下来。先把困惑的地方说出来，再询问。

#### 简单至上

- 只编写最少代码解决问题。不写多余功能。
- 不添加未请求的功能。
- 不为单一使用场景创建抽象。
- 不添加未请求的可配置性。
- 不为不可能的场景编写错误处理。
- 如果写了 200 行而可以用 50 行实现，重写。

#### 精准修改

- 只修改任务需要的部分。不要"改进"相邻的代码、注释或格式。
- 不重构没有损坏的东西。
- 即使做法不同，也要遵循现有风格。
- 如果发现无关的死代码，记录下来，不要删除。
- 删除因修改而孤立的导入/变量/函数。保留原有的死代码除非被要求删除。
- 每一行修改都必须直接追溯到用户的请求。

#### 目标驱动执行

- 将任务转化为可验证的目标：
  - "添加验证" → "为无效输入编写测试，然后通过测试。"
  - "修复 bug" → "编写能复现 bug 的测试，然后通过测试。"
  - "重构 X" → "确保重构前后测试都通过。"

### 运营规则

- **保持清晰**：编写易读、易维护、易解释的代码。
- **先读本地 README**：在编辑目录中的代码之前，检查该目录是否有 `README.md` 并阅读它。
- **上游修复，不要下游修补**：当新功能遇到现有模块的限制时，先标记上游改进，供用户决策，再提出下游解决方案。
- **优先库，自定义其次**：在编写自定义代码之前，检查库/框架文档是否有内置选项或现有解决方案。只有在没有合适的替代方案时才编写自定义代码。
- **通过 subagent 研究**：使用 subagent 查阅外部文档、API、新闻和参考资料。
- **使用 Tailwind CSS + Shadcn UI**：为每个新 UI 组件使用 `@cherrystudio/ui`（Shadcn UI + Tailwind CSS）；禁止添加 `antd`、`HeroUI` 或 `styled-components`。
- **集中日志**：通过 `loggerService` 记录日志——不要使用 `console.log`。
- **集中路径**：使用 `application.getPath('namespace.key', filename?)` 获取主进程文件系统路径——不要调用 `app.getPath()`、`os.homedir()` 或手动构造路径。
- **完成后 Lint、测试、格式化**：`pnpm lint`、`pnpm test` 和 `pnpm format` 成功后才算完成。
- **提交约定**：使用 Conventional Commit 消息进行小而专注的提交。

## 开发

### 命令

首先运行 `pnpm install`。以下是需要知道的脚本：

- `pnpm lint` — oxlint + eslint fix + typecheck + i18n check + format check
- `pnpm test` — 运行所有 Vitest 测试
- `pnpm format` — Biome 格式化和 lint（写入模式）
- `pnpm build:check` — **提交前必须运行**（`pnpm lint && pnpm test`）

### 测试

- 测试使用 Vitest 3。
- **没有测试的功能不算完成**
- **测试模拟**：使用统一的模拟系统——不要为 `application`、服务或数据层创建临时模拟。

### 补丁依赖

升级任何依赖之前，检查 `patches/` 是否有自定义补丁。

## GitHub

### Pull Requests

使用 `gh-create-pr` skill。
回退：直接阅读 `.agents/skills/gh-create-pr/SKILL.md`。

### Code Review

不要在本地运行 `pnpm lint` / `pnpm test` / `pnpm format`——通过 `gh` 检查 CI。

### Issues

使用 `gh-create-issue` skill。
回退：直接阅读 `.agents/skills/gh-create-issue/SKILL.md`。

## 约定

### TypeScript

- 共享类型定义放在 `src/renderer/types/` 或 `src/shared/`。

### 命名约定

**必须阅读**：`docs/references/naming-conventions.md`——文件、目录、标识符和单复数规则。

### 日志

```typescript
import { loggerService } from "@logger";
const logger = loggerService.withContext("moduleName");
logger.info("message", CONTEXT);
logger.warn("message");
logger.error("message", error);
```

- 永远不要使用 `console.log`——始终使用 `loggerService`

### 路径

- 使用 `application.getPath('namespace.key', filename?)` 获取主进程文件系统路径

### i18n

- 所有用户可见的字符串必须使用 `i18next`——不要硬编码 UI 字符串
- 运行 `pnpm i18n:check` 验证；`pnpm i18n:sync` 添加缺失的键
- 语言文件在 `src/renderer/i18n/`

### UI 设计

在进行 UI 组件或页面样式工作时，先阅读 [DESIGN.md](./DESIGN.md) 并严格遵循其颜色、字体、间距和组件规范。

## 架构

### 数据

**必须阅读**：`docs/references/data/README.md` 了解系统选择、架构和模式。

| 系统 | 用途 | API |
|------|------|-----|
| BootConfig | 早期启动设置（生命周期前） | `bootConfigService.get()`, `usePreference('BootConfig.*')` |
| Cache | 临时数据（可以丢失） | `useCache`, `useSharedCache`, `usePersistCache` |
| Preference | 用户设置 | `usePreference` |
| DataApi | 业务数据（关键） | `useQuery`, `useMutation` |

数据库：SQLite + Drizzle ORM

### IPC (IpcApi)

**必须阅读**：`docs/references/ipc/README.md`——RPC vs REST 范式边界、schema/router/preload/facade 分层、`IpcContext`、错误模型、安全性。

### 窗口管理

**必须阅读**：`docs/references/window-manager/README.md`——生命周期模式、池机制、API 参考。

### 主进程服务（生命周期）

**必须阅读**：`docs/references/lifecycle/README.md`——架构、决策指南、使用模式和迁移步骤。

所有拥有长期资源或注册持久副作用的主进程服务**必须**使用生命周期系统：
- 扩展 `BaseService`
- 使用 `@Injectable`、`@ServicePhase`、`@DependsOn` 装饰器
- 在 `serviceRegistry.ts` 注册
- 使用 `application.get('Name')` 访问

### 非生命周期服务

没有长期资源或持久副作用的服务：使用**直接导入的单例**（`export const x = new X()`）。

## 安全

- 永远不要将 Node.js API 直接暴露给渲染进程；在 preload 中使用 `contextBridge`
- 验证主进程处理器中的所有 IPC 输入
- URL 清理
- API 服务器的 IP 验证
- API 服务器请求验证