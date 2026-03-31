# 模型 API 管理模块详细功能清单

📅 生成时间：2026-03-31  
📂 所属层级：核心业务层 → API 网关子域  
🔧 状态：待实现  
📋 参考项目：one-API、sub2API

---

## 一、模块概览

```
模型 API 管理模块（API Gateway）
├── 服务商管理（Provider Management）
├── API Key 管理（API Key Management）
├── 配额与计费（Quota & Billing）
├── 限流与熔断（Rate Limiting & Circuit Breaker）
├── 负载均衡（Load Balancing）
├── 请求中转（Request Relay）
└── 监控与审计（Monitoring & Audit）
```

---

## 二、核心功能分解

### 2.1 服务商管理（Provider Management）

**定位：** 管理上游 AI 服务提供商的 API 接入

#### 2.1.1 支持的服务商类型

| 服务商类型 | 提供商 | API 标准 | 部署方式 | 优先级 |
|------------|--------|----------|----------|--------|
| OpenAI | OpenAI | OpenAI API | 云端 | P0 |
| Azure OpenAI | Microsoft | Azure OpenAI API | 云端 | P0 |
| Claude | Anthropic | Anthropic API | 云端 | P0 |
| Gemini | Google | Google AI API | 云端 | P1 |
| 文心一言 | 百度 | Baidu API | 云端 | P1 |
| 通义千问 | 阿里 | Aliyun API | 云端 | P1 |
| ChatGLM | 智谱 AI | Zhipu API | 云端 | P1 |
| Ollama | Ollama | Ollama API | 本地 | P0 |
| LM Studio | LM Studio | OpenAI 兼容 | 本地 | P0 |
| 本地模型 | 自定义 | 可配置 | 本地 | P1 |
| 自定义服务商 | 其他 | 可配置 | 云端/本地 | P2 |

#### 2.1.2 服务商 CRUD 功能

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| **创建服务商** | 添加新的 API 服务商 | P0 |
| - 服务商名称 | 自定义服务商标识 | P0 |
| - 服务商类型 | OpenAI/Claude/Ollama/LM Studio 等 | P0 |
| - API Key | 上游服务的密钥（加密存储，本地模型可为空） | P0 |
| - API Base URL | 上游 API 地址（本地模型为本地地址） | P0 |
| - 模型列表 | 该服务商支持的模型 | P0 |
| - 服务商分组 | 用于批量管理 | P1 |
| - 优先级 | 负载均衡时的权重 | P1 |
| - 启用状态 | 启用/禁用服务商 | P0 |
| - 部署方式 | 云端/本地 | P0 |
| **查询服务商** | 获取服务商信息 | P0 |
| - 按 ID 查询 | 服务商详情 | P0 |
| - 列表查询 | 分页 + 筛选 | P0 |
| - 按类型筛选 | OpenAI/Claude/Ollama 等 | P0 |
| - 按状态筛选 | 启用/禁用 | P0 |
| - 按部署方式筛选 | 云端/本地 | P1 |
| - 按分组筛选 | 服务商分组 | P1 |
| - 能力查询 | 支持哪些模型 | P0 |
| **更新服务商** | 修改服务商配置 | P0 |
| - 修改 API Key | 更新密钥 | P0 |
| - 修改 Base URL | 更新地址 | P0 |
| - 修改模型列表 | 增删模型 | P0 |
| - 修改优先级 | 调整权重 | P1 |
| - 启用/禁用 | 切换状态 | P0 |
| **删除服务商** | 移除服务商 | P0 |
| - 软删除 | 保留历史记录 | P1 |
| - 删除检查 | 检查是否有绑定 Key | P1 |
| **批量操作** | 批量管理服务商 | P2 |
| - 批量创建 | 导入多个服务商 | P2 |
| - 批量启用/禁用 | 批量切换状态 | P2 |
| - 批量删除 | 批量移除 | P2 |

#### 2.1.3 服务商健康检查

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 自动健康检查 | 定期检测服务商可用性 | P0 |
| 响应时间监控 | 记录每次请求的响应时间 | P0 |
| 成功率统计 | 计算请求成功率 | P0 |
| 故障自动禁用 | 连续失败 N 次后自动禁用 | P1 |
| 故障恢复通知 | 服务商恢复时发送通知 | P2 |
| 余额检查 | 定期检查云端服务商账户余额 | P1 |
| 余额不足告警 | 余额低于阈值时告警 | P1 |
| 本地服务检测 | 检测本地模型服务是否运行 | P0 |

---

### 2.2 API Key 管理（API Key Management）

**定位：** 为下游用户生成和管理访问密钥

#### 2.2.1 API Key 类型

| 类型 | 说明 | 用途 |
|------|------|------|
| 用户 Key | 绑定到具体用户 | 普通用户使用 |
| 服务商 Key | 绑定到上游服务商 | 内部使用 |
| 临时 Key | 有过期时间 | 临时访问/测试 |
| 永久 Key | 无过期时间 | 长期使用 |

#### 2.2.2 API Key CRUD 功能

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| **创建 Key** | 生成新的 API Key | P0 |
| - Key 格式 | sk-xxxxxxxx 格式 | P0 |
| - 绑定用户 | 关联到具体用户 | P0 |
| - 绑定服务商 | 指定可用服务商 | P1 |
| - 设置配额 | 初始配额/令牌数 | P0 |
| - 设置过期时间 | Key 有效期 | P0 |
| - 设置并发数 | 最大并发请求数 | P1 |
| - 设置速率限制 | 每分钟/小时请求数 | P0 |
| - 备注说明 | Key 用途说明 | P1 |
| **查询 Key** | 获取 Key 信息 | P0 |
| - 按 Key 查询 | 通过 Key 获取详情 | P0 |
| - 按用户查询 | 用户的所有 Key | P0 |
| - 按状态查询 | 启用/禁用/过期 | P0 |
| - 使用量查询 | 已用配额/剩余配额 | P0 |
| **更新 Key** | 修改 Key 配置 | P0 |
| - 修改配额 | 增加/减少配额 | P0 |
| - 修改速率限制 | 调整限流参数 | P0 |
| - 修改过期时间 | 延长/缩短有效期 | P0 |
| - 启用/禁用 | 切换状态 | P0 |
| - 重置使用量 | 清零已用配额 | P1 |
| **删除 Key** | 撤销 Key | P0 |
| - 软删除 | 保留使用记录 | P1 |
| - 立即失效 | 使 Key 立即不可用 | P0 |
| **批量操作** | 批量管理 Key | P2 |
| - 批量生成 | 一次性生成多个 Key | P2 |
| - 批量导出 | 导出 Key 列表 | P2 |
| - 批量禁用 | 批量撤销 Key | P2 |

#### 2.2.3 API Key 配额管理

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 配额类型 | 令牌数/请求次数/金额 | P0 |
| 配额查询 | 实时查询剩余配额 | P0 |
| 配额预警 | 配额低于阈值时通知 | P1 |
| 配额耗尽处理 | 自动禁用或拒绝请求 | P0 |
| 配额充值 | 手动或自动增加配额 | P0 |
| 配额转移 | Key 之间转移配额 | P2 |
| 配额明细 | 查看配额使用明细 | P1 |

---

### 2.3 配额与计费（Quota & Billing）

**定位：** 管理用户配额和计费逻辑

#### 2.3.1 计费模式

| 计费模式 | 说明 | 适用场景 |
|----------|------|----------|
| 按 Token 计费 | 根据输入 + 输出 Token 数计费 | OpenAI/Claude 等 |
| 按请求计费 | 每次请求固定费用 | 简单 API |
| 按金额计费 | 直接使用美元金额 | 通用计费 |
| 包月套餐 | 固定月费，无限或限额使用 | 订阅制 |
| 免费额度 | 每月赠送一定额度 | 新用户试用 |

#### 2.3.2 计费功能

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| **计费配置** | 配置计费规则 | P0 |
| - 模型定价 | 每个模型的 Token 单价 | P0 |
| - 服务商加价率 | 在 upstream 价格基础上加价（本地模型可为 0） | P1 |
| - 用户折扣率 | 不同用户的折扣 | P1 |
| - 最低消费 | 每次请求最低消费 | P2 |
| **Token 计算** | 计算请求的 Token 数 | P0 |
| - 输入 Token | 计算 prompt 的 Token 数 | P0 |
| - 输出 Token | 计算 completion 的 Token 数 | P0 |
| - Token 估算 | 请求前预估 Token 数 | P2 |
| **费用计算** | 计算请求费用 | P0 |
| - 实时扣费 | 请求完成后立即扣费 | P0 |
| - 费用明细 | 记录每笔费用明细 | P0 |
| - 费用统计 | 按日/周/月统计 | P1 |
| **余额管理** | 管理用户余额 | P0 |
| - 余额查询 | 实时查询余额 | P0 |
| - 余额充值 | 手动或自动充值 | P0 |
| - 余额预警 | 余额不足时通知 | P1 |
| - 欠费处理 | 欠费时暂停服务 | P0 |

---

### 2.4 限流与熔断（Rate Limiting & Circuit Breaker）

**定位：** 保护系统稳定性和公平性

#### 2.4.1 限流策略

| 限流维度 | 说明 | 优先级 |
|----------|------|--------|
| 用户限流 | 每个用户的请求频率限制 | P0 |
| Key 限流 | 每个 API Key 的请求频率限制 | P0 |
| IP 限流 | 每个 IP 地址的请求频率限制 | P1 |
| 模型限流 | 每个模型的总请求频率限制 | P1 |
| 服务商限流 | 每个上游服务商的请求频率限制 | P0 |
| Token 限流 | 每分钟 Token 使用量限制 | P0 |
| 并发限流 | 同时进行的请求数限制 | P0 |

#### 2.4.2 限流配置

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 限流算法 | 固定窗口/滑动窗口/令牌桶 | P0 |
| 限流阈值 | 可配置请求数/时间窗口 | P0 |
| 限流响应 | 返回 429 Too Many Requests | P0 |
| 限流头信息 | 返回限流相关 HTTP 头 | P1 |
| 限流白名单 | 特定用户/IP 不限流 | P1 |
| 动态限流 | 根据负载动态调整限流值 | P2 |

#### 2.4.3 熔断机制

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 故障检测 | 检测上游服务商故障 | P0 |
| 熔断阈值 | 连续失败次数或失败率 | P0 |
| 熔断状态 | closed/open/half-open | P0 |
| 自动恢复 | 半开状态探测恢复 | P0 |
| 熔断通知 | 熔断时发送告警 | P1 |
| 手动熔断 | 管理员手动触发熔断 | P1 |

---

### 2.5 负载均衡（Load Balancing）

**定位：** 智能分配请求到上游渠道

#### 2.5.1 负载均衡策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| 轮询（Round Robin） | 按顺序轮流分配 | 服务商性能相近 |
| 加权轮询 | 按权重比例分配 | 服务商容量不同 |
| 最少连接 | 分配给当前请求最少的服务商 | 长连接场景 |
| 最快响应 | 分配给响应时间最短的服务商 | 性能敏感场景 |
| 哈希绑定 | 同一用户固定分配到同一服务商 | 需要会话粘性 |
| 优先级 | 优先使用高优先级服务商 | 主备服务商场景 |
| 成本最优 | 优先使用成本最低的服务商 | 成本敏感场景 |

#### 2.5.2 负载均衡功能

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 策略配置 | 为不同模型配置不同策略 | P0 |
| 权重管理 | 设置服务商权重 | P0 |
| 健康检查 | 基于健康状态排除故障服务商 | P0 |
| 会话粘性 | 同一用户固定服务商 | P1 |
| 故障转移 | 主服务商故障时自动切换 | P0 |
| 负载均衡日志 | 记录每次分配决策 | P1 |

---

### 2.6 请求中转（Request Relay）

**定位：** 核心代理转发功能

#### 2.6.1 支持的 API 格式

| API 格式 | 说明 | 优先级 |
|----------|------|--------|
| OpenAI 兼容 | /v1/chat/completions 等 | P0 |
| Anthropic 兼容 | /v1/messages | P0 |
| Google 兼容 | /v1/models/{model}:generateContent | P1 |
| 原生 API | 各厂商原生 API 格式 | P1 |

#### 2.6.2 中转功能

| 功能模块 | 功能点 | 说明 | 优先级 |
|----------|--------|------|--------|
| **请求处理** | API Key 验证 | 验证请求的 API Key | P0 |
| | 权限检查 | 检查模型访问权限 | P0 |
| | 配额检查 | 检查剩余配额 | P0 |
| | 限流检查 | 检查是否超限 | P0 |
| | 请求转换 | 转换为上游 API 格式 | P0 |
| **渠道选择** | 负载均衡 | 根据策略选择服务商 | P0 |
| | 模型匹配 | 确保服务商支持该模型 | P0 |
| | 健康检查 | 排除故障服务商 | P0 |
| **请求转发** | 连接管理 | 管理 HTTP 连接池 | P0 |
| | 超时控制 | 设置请求超时时间 | P0 |
| | 重试机制 | 失败时自动重试 | P1 |
| | 流式传输 | 支持 SSE 流式响应 | P0 |
| **响应处理** | 响应转换 | 转换为标准格式 | P0 |
| | Token 计算 | 计算实际使用 Token 数 | P0 |
| | 费用计算 | 计算本次请求费用 | P0 |
| | 配额扣除 | 扣除用户配额 | P0 |
| | 日志记录 | 记录请求和响应 | P0 |
| **错误处理** | 上游错误 | 转换上游错误格式 | P0 |
| | 配额不足 | 返回配额错误 | P0 |
| | 限流错误 | 返回 429 错误 | P0 |
| | 超时错误 | 返回超时错误 | P0 |

#### 2.6.3 中转 API 端点

| 方法 | 端点 | 说明 | 优先级 |
|------|------|------|--------|
| POST | `/v1/chat/completions` | OpenAI 聊天补全 | P0 |
| POST | `/v1/completions` | OpenAI 文本补全 | P1 |
| GET | `/v1/models` | 获取模型列表 | P0 |
| GET | `/v1/models/{model}` | 获取模型详情 | P1 |
| POST | `/v1/messages` | Anthropic 消息 | P0 |
| POST | `/v1/images/generations` | 图像生成 | P2 |
| POST | `/v1/audio/transcriptions` | 语音转文字 | P2 |
| POST | `/v1/embeddings` | Embedding | P2 |

---

### 2.7 监控与审计（Monitoring & Audit）

**定位：** 系统监控和审计日志

#### 2.7.1 监控指标

| 指标类别 | 具体指标 | 优先级 |
|----------|----------|--------|
| **请求指标** | 总请求数、成功率、平均响应时间 | P0 |
| **Token 指标** | 总 Token 数、输入/输出 Token 分布 | P0 |
| **费用指标** | 总消费、各服务商消费、各模型消费 | P0 |
| **用户指标** | 活跃用户数、新用户数、用户消费排行 | P0 |
| **服务商指标** | 各服务商请求量、成功率、响应时间 | P0 |
| **Key 指标** | 各 Key 使用量、配额使用率 | P0 |
| **限流指标** | 被限流请求数、限流触发率 | P1 |
| **熔断指标** | 熔断次数、熔断服务商列表 | P1 |

#### 2.7.2 监控功能

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 实时仪表盘 | 展示关键指标 | P0 |
| 图表展示 | 请求量/费用趋势图 | P0 |
| 告警配置 | 设置告警阈值 | P1 |
| 告警通知 | 邮件/短信/ webhook 通知 | P1 |
| 报表导出 | 导出日报/周报/月报 | P1 |

#### 2.7.3 审计功能

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 操作日志 | 记录管理员操作 | P0 |
| Key 操作日志 | 记录 Key 的创建/修改/删除 | P0 |
| 服务商操作日志 | 记录服务商的创建/修改/删除 | P0 |
| 配置变更日志 | 记录系统配置变更 | P0 |
| 登录日志 | 记录管理员登录 | P0 |
| 异常行为检测 | 检测异常使用模式 | P2 |

---

## 三、数据库表结构汇总

### 3.1 核心表

| 表名 | 说明 | 优先级 |
|------|------|--------|
| `providers` | 服务商表 | P0 |
| `api_keys` | API Key 表 | P0 |
| `billing_configs` | 计费配置表 | P0 |
| `user_balances` | 用户余额表 | P0 |
| `rate_limit_configs` | 限流配置表 | P0 |
| `circuit_breaker_configs` | 熔断配置表 | P0 |
| `load_balance_configs` | 负载均衡配置表 | P0 |
| `provider_weights` | 服务商权重表 | P0 |

### 3.2 日志表

| 表名 | 说明 | 优先级 |
|------|------|--------|
| `request_logs` | 请求日志表 | P0 |
| `api_key_usage_logs` | API Key 使用日志 | P0 |
| `provider_health_logs` | 服务商健康检查日志 | P1 |
| `rate_limit_logs` | 限流日志表 | P1 |
| `consumption_records` | 消费记录表 | P0 |
| `recharge_records` | 充值记录表 | P0 |

### 3.3 辅助表

| 表名 | 说明 | 优先级 |
|------|------|--------|
| `sticky_sessions` | 会话粘性表 | P1 |
| `system_metrics` | 系统指标汇总表 | P1 |

---

## 四、API 接口设计

### 4.1 服务商管理 API

| 方法 | 路径 | 说明 | 权限要求 |
|------|------|------|----------|
| GET | `/api/providers` | 服务商列表 | provider:read |
| POST | `/api/providers` | 创建服务商 | provider:create |
| GET | `/api/providers/{id}` | 服务商详情 | provider:read |
| PUT | `/api/providers/{id}` | 更新服务商 | provider:update |
| DELETE | `/api/providers/{id}` | 删除服务商 | provider:delete |
| POST | `/api/providers/{id}/test` | 测试服务商 | provider:update |
| POST | `/api/providers/{id}/toggle` | 启用/禁用 | provider:update |
| POST | `/api/providers/batch` | 批量创建 | provider:create |

### 4.2 API Key 管理 API

| 方法 | 路径 | 说明 | 权限要求 |
|------|------|------|----------|
| GET | `/api/keys` | Key 列表 | api_key:read |
| POST | `/api/keys` | 创建 Key | api_key:create |
| GET | `/api/keys/{id}` | Key 详情 | api_key:read |
| PUT | `/api/keys/{id}` | 更新 Key | api_key:update |
| DELETE | `/api/keys/{id}` | 删除 Key | api_key:delete |
| POST | `/api/keys/{id}/revoke` | 撤销 Key | api_key:update |
| POST | `/api/keys/{id}/quota` | 修改配额 | api_key:update |
| GET | `/api/keys/{id}/usage` | 使用量统计 | api_key:read |
| POST | `/api/keys/batch` | 批量生成 | api_key:create |

### 4.3 计费管理 API

| 方法 | 路径 | 说明 | 权限要求 |
|------|------|------|----------|
| GET | `/api/billing/configs` | 计费配置列表 | billing:read |
| PUT | `/api/billing/configs/{model}` | 更新计费配置 | billing:update |
| GET | `/api/billing/balance` | 查询余额 | - |
| POST | `/api/billing/recharge` | 充值 | - |
| GET | `/api/billing/records` | 消费记录 | billing:read |

### 4.4 中转 API（OpenAI 兼容）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/v1/chat/completions` | 聊天补全 | API Key |
| POST | `/v1/completions` | 文本补全 | API Key |
| GET | `/v1/models` | 模型列表 | API Key |
| GET | `/v1/models/{model}` | 模型详情 | API Key |
| POST | `/v1/messages` | Anthropic 消息 | API Key |
| POST | `/v1/embeddings` | Embedding | API Key |

### 4.5 监控 API

| 方法 | 路径 | 说明 | 权限要求 |
|------|------|------|----------|
| GET | `/api/metrics/overview` | 概览指标 | system:read |
| GET | `/api/metrics/requests` | 请求指标 | system:read |
| GET | `/api/metrics/tokens` | Token 指标 | system:read |
| GET | `/api/metrics/costs` | 费用指标 | system:read |
| GET | `/api/metrics/channels` | 服务商指标 | system:read |
| GET | `/api/logs/requests` | 请求日志 | system:read |
| GET | `/api/logs/operations` | 操作日志 | system:read |

---

## 五、开发优先级建议

### 5.1 Phase 1 - 核心中转（P0，预计 10 天）

| 模块 | 功能 | 工时 |
|------|------|------|
| 服务商管理 | 服务商 CRUD、健康检查 | 2 天 |
| API Key 管理 | Key 生成、验证、配额 | 2 天 |
| 请求中转 | OpenAI 兼容接口、服务商选择 | 3 天 |
| 计费基础 | Token 计算、费用扣除 | 2 天 |
| 基础限流 | Key 级别限流 | 1 天 |

### 5.2 Phase 2 - 增强功能（P1，预计 8 天）

| 模块 | 功能 | 工时 |
|------|------|------|
| 负载均衡 | 多种策略、会话粘性 | 2 天 |
| 熔断机制 | 故障检测、自动恢复 | 1 天 |
| 多维限流 | 用户/IP/服务商限流 | 2 天 |
| 监控仪表盘 | 实时指标、图表展示 | 2 天 |
| 多模型支持 | Claude/Gemini/Ollama/LM Studio 等 | 1 天 |

### 5.3 Phase 3 - 高级功能（P2，预计 5 天）

| 模块 | 功能 | 工时 |
|------|------|------|
| 计费增强 | 折扣、套餐、充值 | 2 天 |
| 批量操作 | 批量创建/导出 | 1 天 |
| 告警通知 | 阈值告警、多渠道通知 | 1 天 |
| 审计报表 | 导出报表、异常检测 | 1 天 |

---

## 六、技术选型建议

| 组件 | 推荐技术 | 说明 |
|------|----------|------|
| 后端框架 | Python + aiohttp | 与现有项目一致，异步高性能 |
| 缓存/限流 | Redis | 高性能计数器、分布式限流 |
| 数据库 | PostgreSQL | 现有项目已使用 |
| 连接池 | aiohttp.ClientSession | HTTP 连接复用 |
| Token 计算 | tiktoken | OpenAI 官方 Token 计算库 |
| 配置管理 | 环境变量 + 数据库 | 灵活配置 |
| 日志 | 结构化日志 + 文件轮转 | 便于分析 |

---

## 七、与现有项目集成

### 7.1 用户系统集成

- 复用现有 `users` 表
- 复用现有认证服务（AuthService）
- 复用现有权限系统（PermissionService）

### 7.2 新增权限

| 权限代码 | 说明 |
|----------|------|
| provider:create | 创建服务商 |
| provider:read | 查看服务商 |
| provider:update | 更新服务商 |
| provider:delete | 删除服务商 |
| api_key:create | 创建 API Key |
| api_key:read | 查看 API Key |
| api_key:update | 更新 API Key |
| api_key:delete | 删除 API Key |
| billing:read | 查看计费配置 |
| billing:update | 更新计费配置 |
| system:read | 查看监控指标 |

### 7.3 配置文件扩展

```python
# backend/config/gateway.py
GATEWAY_CONFIG = {
    'default_rate_limit': 60,          # 默认每分钟请求数
    'default_quota': 1000000,          # 默认配额（tokens）
    'key_prefix': 'sk-',               # Key 前缀
    'session_secret': '...',           # 会话密钥
    'redis_url': 'redis://localhost:6379',  # Redis 连接
    'health_check_interval': 300,      # 健康检查间隔（秒）
    'circuit_breaker_threshold': 5,    # 熔断阈值
}
```

---

## 八、安全考虑

| 风险 | 防护措施 |
|------|----------|
| API Key 泄露 | 仅存储哈希值，显示时脱敏 |
| 越权访问 | 严格的权限检查 |
| 配额绕过 | 服务端校验，Redis 原子操作 |
| DDoS 攻击 | 多层限流（IP/ 用户/Key） |
| 上游 Key 泄露 | 加密存储，访问日志审计 |
| 数据篡改 | 关键操作日志记录 |

---

## 九、相关文件位置（建议）

```
backend/
├── api/
│   ├── providers.py         # 服务商管理 API
│   ├── api_keys.py          # API Key 管理 API
│   ├── billing.py           # 计费管理 API
│   └── metrics.py           # 监控 API
├── services/
│   ├── provider_service.py  # 服务商服务
│   ├── api_key_service.py   # API Key 服务
│   ├── billing_service.py   # 计费服务
│   ├── rate_limiter.py      # 限流服务
│   ├── circuit_breaker.py   # 熔断服务
│   ├── load_balancer.py     # 负载均衡服务
│   └── relay_service.py     # 中转服务
├── models/
│   ├── provider.py          # 服务商模型
│   ├── api_key.py           # API Key 模型
│   └── billing.py           # 计费模型
├── gateway/
│   ├── __init__.py
│   ├── proxy.py             # 代理核心
│   ├── transformers/        # 请求/响应转换
│   │   ├── openai.py
│   │   ├── anthropic.py
│   │   ├── google.py
│   │   ├── ollama.py        # Ollama 本地模型
│   │   └── lmstudio.py      # LM Studio 本地模型
│   └── tokenizers/          # Token 计算
│       └── tiktoken_wrapper.py
└── config/
    └── gateway.py           # 网关配置
```

---

*文档维护：IT-Team Agent*  
*最后更新：2026-03-31*  
*参考项目：one-API (songquanpeng), sub2API (Wei-Shaw)*
