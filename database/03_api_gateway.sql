-- ============================================================================
-- API Gateway 模块 - 数据库表结构
-- 版本：v0.4.0
-- 日期：2026-03-31
-- 说明：模型 API 管理模块核心表结构
-- ============================================================================

-- ============================================================================
-- 1. 服务商表 (providers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,                    -- 服务商名称
    type VARCHAR(50) NOT NULL,                     -- 服务商类型：openai/azure/claude/gemini/ollama/lmstudio 等
    api_key TEXT,                                  -- API Key（加密存储）
    api_base_url VARCHAR(500),                     -- API Base URL
    api_version VARCHAR(50),                       -- API 版本（Azure 用）
    models JSONB DEFAULT '[]'::jsonb,             -- 支持的模型列表
    group_name VARCHAR(50),                        -- 服务商分组
    priority INTEGER DEFAULT 0,                    -- 优先级（越高越优先）
    weight INTEGER DEFAULT 1,                      -- 权重（负载均衡用）
    enabled BOOLEAN DEFAULT true,                  -- 启用状态
    deployment_type VARCHAR(20) DEFAULT 'cloud',   -- 部署方式：cloud/local
    config JSONB DEFAULT '{}'::jsonb,             -- 额外配置
    health_status VARCHAR(20) DEFAULT 'unknown',   -- 健康状态：unknown/healthy/unhealthy
    last_health_check TIMESTAMP WITH TIME ZONE,    -- 最后健康检查时间
    response_time_avg INTEGER DEFAULT 0,           -- 平均响应时间（毫秒）
    success_rate DECIMAL(5,2) DEFAULT 100.00,     -- 成功率（百分比）
    balance DECIMAL(10,2),                         -- 账户余额（云端服务商）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,           -- 软删除
    
    CONSTRAINT providers_name_unique UNIQUE (name),
    CONSTRAINT providers_type_check CHECK (type IN (
        'openai', 'azure', 'claude', 'gemini', 'baidu', 'aliyun', 'zhipu',
        'ollama', 'lmstudio', 'custom'
    )),
    CONSTRAINT providers_deployment_type_check CHECK (deployment_type IN ('cloud', 'local'))
);

-- 索引
CREATE INDEX idx_providers_type ON providers(type);
CREATE INDEX idx_providers_enabled ON providers(enabled);
CREATE INDEX idx_providers_deployment_type ON providers(deployment_type);
CREATE INDEX idx_providers_health_status ON providers(health_status);
CREATE INDEX idx_providers_group_name ON providers(group_name);

-- 注释
COMMENT ON TABLE providers IS 'AI 服务商表';
COMMENT ON COLUMN providers.id IS '服务商 ID';
COMMENT ON COLUMN providers.name IS '服务商名称';
COMMENT ON COLUMN providers.type IS '服务商类型';
COMMENT ON COLUMN providers.api_key IS 'API Key（加密存储）';
COMMENT ON COLUMN providers.api_base_url IS 'API Base URL';
COMMENT ON COLUMN providers.models IS '支持的模型列表 JSON';
COMMENT ON COLUMN providers.priority IS '优先级（越高越优先）';
COMMENT ON COLUMN providers.weight IS '负载均衡权重';
COMMENT ON COLUMN providers.health_status IS '健康状态';


-- ============================================================================
-- 2. API Key 表 (api_keys)
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) NOT NULL,                 -- Key 的哈希值（SHA-256）
    key_prefix VARCHAR(20) NOT NULL,               -- Key 前缀（用于显示，如 sk-abc123）
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- 绑定用户
    name VARCHAR(100),                             -- Key 名称/备注
    quota_type VARCHAR(20) DEFAULT 'tokens',       -- 配额类型：tokens/requests/amount
    quota_total BIGINT DEFAULT 0,                  -- 总配额
    quota_used BIGINT DEFAULT 0,                   -- 已用配额
    rate_limit INTEGER DEFAULT 60,                 -- 每分钟请求数限制
    concurrent_limit INTEGER DEFAULT 10,           -- 并发请求数限制
    enabled BOOLEAN DEFAULT true,                  -- 启用状态
    expires_at TIMESTAMP WITH TIME ZONE,           -- 过期时间
    last_used_at TIMESTAMP WITH TIME ZONE,         -- 最后使用时间
    provider_ids UUID[],                           -- 绑定的服务商 ID 列表（空表示不限）
    model_access JSONB DEFAULT '[]'::jsonb,       -- 可访问的模型列表（空表示不限）
    ip_whitelist TEXT[],                           -- IP 白名单
    ip_blacklist TEXT[],                           -- IP 黑名单
    metadata JSONB DEFAULT '{}'::jsonb,           -- 元数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,           -- 软删除
    
    CONSTRAINT api_keys_key_hash_unique UNIQUE (key_hash)
);

-- 索引
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_enabled ON api_keys(enabled);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);

-- 注释
COMMENT ON TABLE api_keys IS 'API Key 表';
COMMENT ON COLUMN api_keys.key_hash IS 'Key 的哈希值';
COMMENT ON COLUMN api_keys.key_prefix IS 'Key 前缀（用于显示）';
COMMENT ON COLUMN api_keys.user_id IS '绑定用户 ID';
COMMENT ON COLUMN api_keys.quota_total IS '总配额';
COMMENT ON COLUMN api_keys.quota_used IS '已用配额';
COMMENT ON COLUMN api_keys.rate_limit IS '每分钟请求数限制';
COMMENT ON COLUMN api_keys.provider_ids IS '绑定的服务商 ID 列表';
COMMENT ON COLUMN api_keys.model_access IS '可访问的模型列表';


-- ============================================================================
-- 3. 计费配置表 (billing_configs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,              -- 模型名称
    provider_type VARCHAR(50),                     -- 服务商类型（空表示通用）
    input_price DECIMAL(12,6) DEFAULT 0,          -- 输入 Token 单价（每 1000 tokens）
    output_price DECIMAL(12,6) DEFAULT 0,         -- 输出 Token 单价（每 1000 tokens）
    price_unit INTEGER DEFAULT 1000,               -- 计价单位（tokens）
    currency VARCHAR(10) DEFAULT 'CNY',           -- 货币单位
    markup_rate DECIMAL(5,4) DEFAULT 1.0,         -- 加价率（1.0 表示原价）
    min_charge DECIMAL(10,4) DEFAULT 0,           -- 最低消费
    enabled BOOLEAN DEFAULT true,                  -- 启用状态
    effective_at TIMESTAMP WITH TIME ZONE,         -- 生效时间
    expires_at TIMESTAMP WITH TIME ZONE,           -- 失效时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT billing_configs_model_unique UNIQUE (model_name, provider_type)
);

-- 索引
CREATE INDEX idx_billing_configs_model ON billing_configs(model_name);
CREATE INDEX idx_billing_configs_provider_type ON billing_configs(provider_type);
CREATE INDEX idx_billing_configs_enabled ON billing_configs(enabled);

-- 注释
COMMENT ON TABLE billing_configs IS '计费配置表';
COMMENT ON COLUMN billing_configs.model_name IS '模型名称';
COMMENT ON COLUMN billing_configs.input_price IS '输入 Token 单价';
COMMENT ON COLUMN billing_configs.output_price IS '输出 Token 单价';
COMMENT ON COLUMN billing_configs.markup_rate IS '加价率';


-- ============================================================================
-- 4. 用户余额表 (user_balances)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,  -- 用户 ID
    balance DECIMAL(12,4) DEFAULT 0,                -- 余额
    total_recharge DECIMAL(12,4) DEFAULT 0,        -- 累计充值
    total_consumption DECIMAL(12,4) DEFAULT 0,     -- 累计消费
    currency VARCHAR(10) DEFAULT 'CNY',           -- 货币单位
    status VARCHAR(20) DEFAULT 'normal',           -- 状态：normal/frozen/overdraft
    overdraft_limit DECIMAL(12,4) DEFAULT 0,      -- 透支额度
    last_recharge_at TIMESTAMP WITH TIME ZONE,    -- 最后充值时间
    last_consumption_at TIMESTAMP WITH TIME ZONE, -- 最后消费时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT user_balances_user_id_unique UNIQUE (user_id)
);

-- 索引
CREATE INDEX idx_user_balances_user_id ON user_balances(user_id);
CREATE INDEX idx_user_balances_status ON user_balances(status);

-- 注释
COMMENT ON TABLE user_balances IS '用户余额表';
COMMENT ON COLUMN user_balances.balance IS '当前余额';
COMMENT ON COLUMN user_balances.total_recharge IS '累计充值';
COMMENT ON COLUMN user_balances.total_consumption IS '累计消费';


-- ============================================================================
-- 5. 限流配置表 (rate_limit_configs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,                    -- 配置名称
    scope VARCHAR(20) NOT NULL,                    -- 限流维度：user/key/ip/model/provider
    scope_id UUID,                                 -- 维度 ID（用户 ID/Key ID 等）
    algorithm VARCHAR(20) DEFAULT 'sliding_window', -- 算法：fixed_window/sliding_window/token_bucket
    max_requests INTEGER DEFAULT 60,               -- 最大请求数
    window_seconds INTEGER DEFAULT 60,             -- 时间窗口（秒）
    burst_size INTEGER,                            -- 突发大小（令牌桶用）
    refill_rate INTEGER,                           -- 补充速率（令牌桶用）
    enabled BOOLEAN DEFAULT true,                  -- 启用状态
    action VARCHAR(20) DEFAULT 'reject',           -- 超限动作：reject/delay/queue
    whitelist TEXT[],                              -- 白名单
    blacklist TEXT[],                              -- 黑名单
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT rate_limit_configs_name_unique UNIQUE (name)
);

-- 索引
CREATE INDEX idx_rate_limit_configs_scope ON rate_limit_configs(scope);
CREATE INDEX idx_rate_limit_configs_scope_id ON rate_limit_configs(scope_id);
CREATE INDEX idx_rate_limit_configs_enabled ON rate_limit_configs(enabled);

-- 注释
COMMENT ON TABLE rate_limit_configs IS '限流配置表';
COMMENT ON COLUMN rate_limit_configs.scope IS '限流维度';
COMMENT ON COLUMN rate_limit_configs.algorithm IS '限流算法';
COMMENT ON COLUMN rate_limit_configs.max_requests IS '最大请求数';
COMMENT ON COLUMN rate_limit_configs.window_seconds IS '时间窗口';


-- ============================================================================
-- 6. 熔断配置表 (circuit_breaker_configs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS circuit_breaker_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,  -- 服务商 ID
    failure_threshold INTEGER DEFAULT 5,           -- 失败阈值（连续失败次数）
    failure_rate_threshold DECIMAL(5,2) DEFAULT 50.00,  -- 失败率阈值（百分比）
    success_threshold INTEGER DEFAULT 3,           -- 成功阈值（半开状态成功次数）
    timeout_seconds INTEGER DEFAULT 60,            -- 熔断超时（秒）
    half_open_max_requests INTEGER DEFAULT 3,     -- 半开状态最大请求数
    enabled BOOLEAN DEFAULT true,                  -- 启用状态
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT circuit_breaker_configs_provider_id_unique UNIQUE (provider_id)
);

-- 索引
CREATE INDEX idx_circuit_breaker_configs_provider_id ON circuit_breaker_configs(provider_id);
CREATE INDEX idx_circuit_breaker_configs_enabled ON circuit_breaker_configs(enabled);

-- 注释
COMMENT ON TABLE circuit_breaker_configs IS '熔断配置表';
COMMENT ON COLUMN circuit_breaker_configs.failure_threshold IS '失败阈值';
COMMENT ON COLUMN circuit_breaker_configs.failure_rate_threshold IS '失败率阈值';
COMMENT ON COLUMN circuit_breaker_configs.timeout_seconds IS '熔断超时';


-- ============================================================================
-- 7. 负载均衡配置表 (load_balance_configs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS load_balance_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,              -- 模型名称
    strategy VARCHAR(20) DEFAULT 'round_robin',    -- 策略：round_robin/weighted/least_conn/fastest/hash/priority/cost
    sticky_session BOOLEAN DEFAULT false,          -- 会话粘性
    sticky_duration_seconds INTEGER DEFAULT 3600,  -- 粘性持续时间（秒）
    health_check_enabled BOOLEAN DEFAULT true,     -- 启用健康检查
    failover_enabled BOOLEAN DEFAULT true,         -- 启用故障转移
    max_failover_attempts INTEGER DEFAULT 3,      -- 最大故障转移次数
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT load_balance_configs_model_unique UNIQUE (model_name)
);

-- 索引
CREATE INDEX idx_load_balance_configs_model ON load_balance_configs(model_name);
CREATE INDEX idx_load_balance_configs_strategy ON load_balance_configs(strategy);

-- 注释
COMMENT ON TABLE load_balance_configs IS '负载均衡配置表';
COMMENT ON COLUMN load_balance_configs.strategy IS '负载均衡策略';
COMMENT ON COLUMN load_balance_configs.sticky_session IS '会话粘性';
COMMENT ON COLUMN load_balance_configs.failover_enabled IS '启用故障转移';


-- ============================================================================
-- 8. 请求日志表 (request_logs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id),       -- API Key ID
    provider_id UUID REFERENCES providers(id),     -- 服务商 ID
    user_id UUID REFERENCES users(id),             -- 用户 ID
    request_id VARCHAR(100) NOT NULL,              -- 请求 ID（外部传入）
    model_name VARCHAR(100) NOT NULL,              -- 模型名称
    endpoint VARCHAR(200) NOT NULL,                -- 请求端点
    method VARCHAR(10) DEFAULT 'POST',             -- 请求方法
    status_code INTEGER,                           -- 响应状态码
    input_tokens INTEGER DEFAULT 0,                -- 输入 Token 数
    output_tokens INTEGER DEFAULT 0,               -- 输出 Token 数
    total_tokens INTEGER DEFAULT 0,                -- 总 Token 数
    cost DECIMAL(10,4) DEFAULT 0,                 -- 费用
    duration_ms INTEGER,                           -- 耗时（毫秒）
    ip_address INET,                               -- 客户端 IP
    user_agent TEXT,                               -- 用户代理
    request_body JSONB,                            -- 请求体（可选存储）
    response_body JSONB,                           -- 响应体（可选存储）
    error_message TEXT,                            -- 错误信息
    is_stream BOOLEAN DEFAULT false,               -- 是否流式请求
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT request_logs_request_id_unique UNIQUE (request_id)
);

-- 索引
CREATE INDEX idx_request_logs_api_key_id ON request_logs(api_key_id);
CREATE INDEX idx_request_logs_provider_id ON request_logs(provider_id);
CREATE INDEX idx_request_logs_user_id ON request_logs(user_id);
CREATE INDEX idx_request_logs_model_name ON request_logs(model_name);
CREATE INDEX idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX idx_request_logs_status_code ON request_logs(status_code);

-- 注释
COMMENT ON TABLE request_logs IS '请求日志表';
COMMENT ON COLUMN request_logs.input_tokens IS '输入 Token 数';
COMMENT ON COLUMN request_logs.output_tokens IS '输出 Token 数';
COMMENT ON COLUMN request_logs.cost IS '费用';
COMMENT ON COLUMN request_logs.duration_ms IS '耗时';


-- ============================================================================
-- 9. 消费记录表 (consumption_records)
-- ============================================================================

CREATE TABLE IF NOT EXISTS consumption_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- 用户 ID
    api_key_id UUID REFERENCES api_keys(id),       -- API Key ID
    request_log_id UUID REFERENCES request_logs(id),  -- 请求日志 ID
    amount DECIMAL(10,4) NOT NULL,                 -- 消费金额
    tokens INTEGER NOT NULL,                       -- 消耗 Token 数
    token_type VARCHAR(10) DEFAULT 'total',        -- Token 类型：input/output/total
    model_name VARCHAR(100),                       -- 模型名称
    provider_id UUID REFERENCES providers(id),     -- 服务商 ID
    balance_before DECIMAL(12,4),                  -- 消费前余额
    balance_after DECIMAL(12,4),                   -- 消费后余额
    description TEXT,                              -- 描述
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_consumption_records_user_id ON consumption_records(user_id);
CREATE INDEX idx_consumption_records_api_key_id ON consumption_records(api_key_id);
CREATE INDEX idx_consumption_records_created_at ON consumption_records(created_at);

-- 注释
COMMENT ON TABLE consumption_records IS '消费记录表';
COMMENT ON COLUMN consumption_records.amount IS '消费金额';
COMMENT ON COLUMN consumption_records.tokens IS '消耗 Token 数';
COMMENT ON COLUMN consumption_records.balance_before IS '消费前余额';
COMMENT ON COLUMN consumption_records.balance_after IS '消费后余额';


-- ============================================================================
-- 10. 充值记录表 (recharge_records)
-- ============================================================================

CREATE TABLE IF NOT EXISTS recharge_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- 用户 ID
    amount DECIMAL(10,4) NOT NULL,                 -- 充值金额
    currency VARCHAR(10) DEFAULT 'CNY',           -- 货币单位
    payment_method VARCHAR(50),                    -- 支付方式：admin/manual/alipay/wechat
    transaction_id VARCHAR(100),                   -- 交易 ID
    balance_before DECIMAL(12,4),                  -- 充值前余额
    balance_after DECIMAL(12,4),                   -- 充值后余额
    description TEXT,                              -- 描述
    operator_id UUID REFERENCES users(id),         -- 操作人 ID
    status VARCHAR(20) DEFAULT 'completed',        -- 状态：pending/completed/failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX idx_recharge_records_user_id ON recharge_records(user_id);
CREATE INDEX idx_recharge_records_created_at ON recharge_records(created_at);
CREATE INDEX idx_recharge_records_status ON recharge_records(status);

-- 注释
COMMENT ON TABLE recharge_records IS '充值记录表';
COMMENT ON COLUMN recharge_records.amount IS '充值金额';
COMMENT ON COLUMN recharge_records.payment_method IS '支付方式';
COMMENT ON COLUMN recharge_records.balance_before IS '充值前余额';
COMMENT ON COLUMN recharge_records.balance_after IS '充值后余额';


-- ============================================================================
-- 11. 服务商健康检查日志表 (provider_health_logs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS provider_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,  -- 服务商 ID
    status VARCHAR(20) NOT NULL,                   -- 状态：healthy/unhealthy/timeout/error
    response_time_ms INTEGER,                      -- 响应时间（毫秒）
    status_code INTEGER,                           -- HTTP 状态码
    error_message TEXT,                            -- 错误信息
    test_model VARCHAR(100),                       -- 测试模型
    test_endpoint VARCHAR(200),                    -- 测试端点
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_provider_health_logs_provider_id ON provider_health_logs(provider_id);
CREATE INDEX idx_provider_health_logs_created_at ON provider_health_logs(created_at);
CREATE INDEX idx_provider_health_logs_status ON provider_health_logs(status);

-- 注释
COMMENT ON TABLE provider_health_logs IS '服务商健康检查日志表';


-- ============================================================================
-- 12. 会话粘性表 (sticky_sessions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sticky_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,  -- API Key ID
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,  -- 服务商 ID
    model_name VARCHAR(100),                       -- 模型名称
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- 过期时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT sticky_sessions_api_key_model_unique UNIQUE (api_key_id, model_name)
);

-- 索引
CREATE INDEX idx_sticky_sessions_api_key_id ON sticky_sessions(api_key_id);
CREATE INDEX idx_sticky_sessions_expires_at ON sticky_sessions(expires_at);

-- 注释
COMMENT ON TABLE sticky_sessions IS '会话粘性表';


-- ============================================================================
-- 13. 系统指标汇总表 (system_metrics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,                     -- 日期
    metric_hour INTEGER,                           -- 小时（0-23）
    metric_type VARCHAR(50) NOT NULL,              -- 指标类型：requests/tokens/cost/users/providers
    metric_name VARCHAR(100) NOT NULL,             -- 指标名称
    metric_value DECIMAL(20,4) DEFAULT 0,         -- 指标值
    dimensions JSONB DEFAULT '{}'::jsonb,         -- 维度（服务商/模型/用户等）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT system_metrics_unique UNIQUE (metric_date, metric_hour, metric_type, metric_name, dimensions)
);

-- 索引
CREATE INDEX idx_system_metrics_date ON system_metrics(metric_date);
CREATE INDEX idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);

-- 注释
COMMENT ON TABLE system_metrics IS '系统指标汇总表';


-- ============================================================================
-- 初始化数据
-- ============================================================================

-- 1. 初始化默认计费配置
INSERT INTO billing_configs (model_name, provider_type, input_price, output_price, currency) VALUES
    ('gpt-3.5-turbo', 'openai', 0.0014, 0.0021, 'USD'),
    ('gpt-4', 'openai', 0.03, 0.06, 'USD'),
    ('gpt-4-turbo', 'openai', 0.01, 0.03, 'USD'),
    ('claude-3-opus', 'claude', 0.015, 0.075, 'USD'),
    ('claude-3-sonnet', 'claude', 0.003, 0.015, 'USD'),
    ('gemini-pro', 'gemini', 0.00025, 0.0005, 'USD'),
    ('text-embedding-ada-002', 'openai', 0.0001, 0, 'USD')
ON CONFLICT (model_name, provider_type) DO NOTHING;

-- 2. 初始化默认负载均衡配置
INSERT INTO load_balance_configs (model_name, strategy, sticky_session, health_check_enabled, failover_enabled) VALUES
    ('gpt-3.5-turbo', 'weighted', false, true, true),
    ('gpt-4', 'priority', false, true, true),
    ('claude-3-sonnet', 'round_robin', false, true, true)
ON CONFLICT (model_name) DO NOTHING;

-- 3. 初始化默认限流配置
INSERT INTO rate_limit_configs (name, scope, algorithm, max_requests, window_seconds, enabled) VALUES
    ('default_user_limit', 'user', 'sliding_window', 100, 60, true),
    ('default_key_limit', 'key', 'sliding_window', 60, 60, true),
    ('default_ip_limit', 'ip', 'sliding_window', 200, 60, true)
ON CONFLICT (name) DO NOTHING;

-- 4. 初始化默认熔断配置（需要 provider_id，在创建服务商后由代码自动创建）

-- ============================================================================
-- 视图：API Key 使用统计
-- ============================================================================

CREATE OR REPLACE VIEW api_key_stats AS
SELECT 
    ak.id,
    ak.key_prefix,
    ak.user_id,
    ak.name,
    ak.quota_total,
    ak.quota_used,
    ak.quota_total - ak.quota_used AS quota_remaining,
    ak.rate_limit,
    ak.enabled,
    ak.expires_at,
    ak.last_used_at,
    COUNT(rl.id) AS total_requests,
    COALESCE(SUM(rl.total_tokens), 0) AS total_tokens,
    COALESCE(SUM(rl.cost), 0) AS total_cost,
    CASE 
        WHEN ak.expires_at IS NULL THEN 'permanent'
        WHEN ak.expires_at > CURRENT_TIMESTAMP THEN 'active'
        ELSE 'expired'
    END AS status
FROM api_keys ak
LEFT JOIN request_logs rl ON rl.api_key_id = ak.id
WHERE ak.deleted_at IS NULL
GROUP BY ak.id;

-- ============================================================================
-- 视图：服务商统计
-- ============================================================================

CREATE OR REPLACE VIEW provider_stats AS
SELECT 
    p.id,
    p.name,
    p.type,
    p.deployment_type,
    p.enabled,
    p.health_status,
    p.priority,
    p.weight,
    COUNT(DISTINCT rl.id) AS total_requests,
    COUNT(DISTINCT rl.user_id) AS active_users,
    COALESCE(SUM(rl.total_tokens), 0) AS total_tokens,
    COALESCE(AVG(rl.duration_ms), 0) AS avg_response_time,
    COALESCE(
        COUNT(CASE WHEN rl.status_code >= 200 AND rl.status_code < 300 THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(rl.id), 0) * 100, 
        0
    ) AS success_rate
FROM providers p
LEFT JOIN request_logs rl ON rl.provider_id = p.id AND rl.created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
WHERE p.deleted_at IS NULL
GROUP BY p.id;

-- ============================================================================
-- 触发器：更新时间戳
-- ============================================================================

-- providers 表
CREATE OR REPLACE FUNCTION update_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_providers_updated_at
    BEFORE UPDATE ON providers
    FOR EACH ROW
    EXECUTE FUNCTION update_providers_updated_at();

-- api_keys 表
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_api_keys_updated_at();

-- billing_configs 表
CREATE OR REPLACE FUNCTION update_billing_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_billing_configs_updated_at
    BEFORE UPDATE ON billing_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_billing_configs_updated_at();

-- user_balances 表
CREATE OR REPLACE FUNCTION update_user_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_balances_updated_at
    BEFORE UPDATE ON user_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_user_balances_updated_at();

-- rate_limit_configs 表
CREATE OR REPLACE FUNCTION update_rate_limit_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rate_limit_configs_updated_at
    BEFORE UPDATE ON rate_limit_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_rate_limit_configs_updated_at();

-- load_balance_configs 表
CREATE OR REPLACE FUNCTION update_load_balance_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_load_balance_configs_updated_at
    BEFORE UPDATE ON load_balance_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_load_balance_configs_updated_at();

-- ============================================================================
-- 完成提示
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '  API Gateway 数据库表结构创建完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '  创建表：13 个';
    RAISE NOTICE '    - providers (服务商)';
    RAISE NOTICE '    - api_keys (API Key)';
    RAISE NOTICE '    - billing_configs (计费配置)';
    RAISE NOTICE '    - user_balances (用户余额)';
    RAISE NOTICE '    - rate_limit_configs (限流配置)';
    RAISE NOTICE '    - circuit_breaker_configs (熔断配置)';
    RAISE NOTICE '    - load_balance_configs (负载均衡配置)';
    RAISE NOTICE '    - request_logs (请求日志)';
    RAISE NOTICE '    - consumption_records (消费记录)';
    RAISE NOTICE '    - recharge_records (充值记录)';
    RAISE NOTICE '    - provider_health_logs (健康检查日志)';
    RAISE NOTICE '    - sticky_sessions (会话粘性)';
    RAISE NOTICE '    - system_metrics (系统指标)';
    RAISE NOTICE '';
    RAISE NOTICE '  创建视图：2 个';
    RAISE NOTICE '    - api_key_stats (API Key 统计)';
    RAISE NOTICE '    - provider_stats (服务商统计)';
    RAISE NOTICE '';
    RAISE NOTICE '  初始化数据：';
    RAISE NOTICE '    - 计费配置：7 条';
    RAISE NOTICE '    - 负载均衡配置：3 条';
    RAISE NOTICE '    - 限流配置：3 条';
    RAISE NOTICE '========================================';
END $$;
