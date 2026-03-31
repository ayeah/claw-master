# API 网关模块术语更新说明

📅 更新时间：2026-03-31  
🔄 更新原因：避免与未来 IM 通讯协议中的 `channels` 术语冲突

---

## 一、术语变更

| 原术语 | 新术语 | 英文 | 说明 |
|--------|--------|------|------|
| 渠道 | 服务商 | Provider | 指上游 AI 服务提供商 |
| 渠道类型 | 服务商类型 | Provider Type | 如 OpenAI/Claude/Ollama 等 |
| 渠道管理 | 服务商管理 | Provider Management | 服务商 CRUD 和健康检查 |
| 渠道 Key | 服务商 Key | Provider Key | 绑定到上游服务商的 API Key |

---

## 二、新增服务商类型

### 本地模型服务商（新增）

| 服务商类型 | 提供商 | API 标准 | 部署方式 | 优先级 |
|------------|--------|----------|----------|--------|
| **Ollama** | Ollama | Ollama API | 本地 | P0 |
| **LM Studio** | LM Studio | OpenAI 兼容 | 本地 | P0 |
| **本地模型** | 自定义 | 可配置 | 本地 | P1 |

### 云端服务商（已有）

| 服务商类型 | 提供商 | API 标准 | 部署方式 |
|------------|--------|----------|----------|
| OpenAI | OpenAI | OpenAI API | 云端 |
| Azure OpenAI | Microsoft | Azure OpenAI API | 云端 |
| Claude | Anthropic | Anthropic API | 云端 |
| Gemini | Google | Google AI API | 云端 |
| 文心一言 | 百度 | Baidu API | 云端 |
| 通义千问 | 阿里 | Aliyun API | 云端 |
| ChatGLM | 智谱 AI | Zhipu API | 云端 |

---

## 三、数据库表名变更

| 原表名 | 新表名 | 说明 |
|--------|--------|------|
| `channels` | `providers` | 服务商表 |
| `channel_weights` | `provider_weights` | 服务商权重表 |
| `channel_health_logs` | `provider_health_logs` | 服务商健康检查日志 |

---

## 四、权限代码变更

| 原权限代码 | 新权限代码 | 说明 |
|------------|------------|------|
| `channel:create` | `provider:create` | 创建服务商 |
| `channel:read` | `provider:read` | 查看服务商 |
| `channel:update` | `provider:update` | 更新服务商 |
| `channel:delete` | `provider:delete` | 删除服务商 |

---

## 五、API 路径变更

| 原 API 路径 | 新 API 路径 | 说明 |
|-------------|-------------|------|
| `/api/channels` | `/api/providers` | 服务商管理 API |
| `/api/metrics/channels` | `/api/metrics/providers` | 服务商指标 API |

---

## 六、本地模型服务商特性

### Ollama

- **API 格式**: Ollama 原生 API
- **默认地址**: `http://localhost:11434`
- **认证方式**: 无需 API Key（本地服务）
- **支持模型**: 通过 Ollama 拉取的各种开源模型
- **特性**: 
  - 支持流式输出
  - 支持本地 GPU 加速
  - 模型热切换

### LM Studio

- **API 格式**: OpenAI 兼容 API
- **默认地址**: `http://localhost:1234/v1`
- **认证方式**: 无需 API Key（可配置）
- **支持模型**: GGUF 格式模型
- **特性**:
  - 完全兼容 OpenAI API 格式
  - 图形化界面管理模型
  - 支持多模型同时加载

### 本地模型通用配置

```python
{
    'deployment_type': 'local',
    'api_key': None,  # 本地服务通常不需要 API Key
    'api_base_url': 'http://localhost:11434',  # 本地地址
    'config': {
        'timeout': 120,  # 本地模型响应较慢，超时时间更长
        'retry_count': 2,
        'gpu_acceleration': True,
        'max_context_length': 8192
    }
}
```

---

## 七、文件结构变更

```
backend/
├── api/
│   ├── providers.py         # 原名：channels.py
│   └── ...
├── services/
│   ├── provider_service.py  # 原名：channel_service.py
│   └── ...
├── models/
│   ├── provider.py          # 原名：channel.py
│   └── ...
└── gateway/
    └── transformers/
        ├── ollama.py        # 新增：Ollama 转换器
        └── lmstudio.py      # 新增：LM Studio 转换器
```

---

## 八、迁移步骤（未来实施）

1. **数据库迁移**
   ```sql
   ALTER TABLE channels RENAME TO providers;
   ALTER TABLE channel_weights RENAME TO provider_weights;
   ALTER TABLE channel_health_logs RENAME TO provider_health_logs;
   
   ALTER TABLE providers RENAME COLUMN channel_type TO provider_type;
   ALTER TABLE providers RENAME COLUMN group_name TO provider_group;
   ```

2. **代码迁移**
   - 重命名文件：`channels.py` → `providers.py`
   - 全局搜索替换：`channel` → `provider`（注意大小写）
   - 更新导入语句

3. **权限迁移**
   - 更新权限表中的权限代码
   - 更新角色权限关联

4. **API 兼容性**
   - 保留旧 API 路径的临时重定向（可选）
   - 更新文档和客户端代码

---

## 九、注意事项

1. **向后兼容**: 如果已有代码使用 `channels`，需要逐步迁移
2. **文档同步**: 确保所有文档使用新术语
3. **培训团队**: 确保团队成员了解术语变更
4. **Git 历史**: 保留重命名记录，便于追溯

---

*更新人：IT-Team Agent*  
*更新时间：2026-03-31*
