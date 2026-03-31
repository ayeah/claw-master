-- ============================================================================
-- OpenClaw 数据库初始化脚本
-- 数据库：claw-master
-- ============================================================================

-- 注意：数据库应在外部创建，此脚本假设已连接到 claw-master 数据库
-- 如果未创建，请先运行：CREATE DATABASE "claw-master";

-- ============================================================================
-- 扩展
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 用户表
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- 添加注释
COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.id IS '用户 ID';
COMMENT ON COLUMN users.username IS '用户名（唯一）';
COMMENT ON COLUMN users.email IS '邮箱（唯一）';
COMMENT ON COLUMN users.password_hash IS '密码哈希';
COMMENT ON COLUMN users.display_name IS '显示名称';
COMMENT ON COLUMN users.avatar_url IS '头像 URL';
COMMENT ON COLUMN users.role IS '角色：admin, user, guest';
COMMENT ON COLUMN users.status IS '状态：active, inactive, banned';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN users.last_login_ip IS '最后登录 IP';

-- ============================================================================
-- 角色表
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- 添加注释
COMMENT ON TABLE roles IS '角色表';
COMMENT ON COLUMN roles.permissions IS '权限列表（JSON 数组）';

-- ============================================================================
-- 插入默认角色
-- ============================================================================
INSERT INTO roles (name, description, permissions) VALUES
    ('admin', '系统管理员', '["*"]'::jsonb),
    ('user', '普通用户', '["read", "write"]'::jsonb),
    ('guest', '访客', '["read"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 会话表（用于登录会话管理）
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 添加注释
COMMENT ON TABLE sessions IS '用户会话表';
COMMENT ON COLUMN sessions.token IS '会话令牌';
COMMENT ON COLUMN sessions.expires_at IS '过期时间';
COMMENT ON COLUMN sessions.revoked_at IS '撤销时间';

-- ============================================================================
-- 登录日志表
-- ============================================================================
CREATE TABLE IF NOT EXISTS login_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50),
    email VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    failure_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_login_logs_username ON login_logs(username);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_login_logs_success ON login_logs(success);

-- 添加注释
COMMENT ON TABLE login_logs IS '登录日志表';
COMMENT ON COLUMN login_logs.failure_reason IS '失败原因：invalid_password, user_not_found, account_banned, etc.';

-- ============================================================================
-- 插入默认管理员用户
-- 用户名：admin
-- 密码：Admin@123
-- ============================================================================
INSERT INTO users (username, email, password_hash, display_name, role, status) VALUES
    ('admin', 
     'admin@openclaw.local', 
     crypt('Admin@123', gen_salt('bf', 12)), 
     '系统管理员', 
     'admin', 
     'active')
ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- 创建更新时间的触发器函数
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为用户表添加触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为角色表添加触发器
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 创建视图：活跃用户
-- ============================================================================
CREATE OR REPLACE VIEW active_users AS
SELECT 
    id,
    username,
    email,
    display_name,
    avatar_url,
    role,
    last_login_at,
    created_at
FROM users
WHERE status = 'active' 
  AND deleted_at IS NULL;

-- ============================================================================
-- 权限检查函数
-- ============================================================================
CREATE OR REPLACE FUNCTION check_user_permission(required_permission VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    user_roles JSONB;
BEGIN
    -- 这里简化实现，实际应该根据当前用户查询角色权限
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 完成提示
-- ============================================================================
SELECT '数据库初始化完成！' AS message;
SELECT '默认管理员账号：admin / Admin@123' AS default_admin;
