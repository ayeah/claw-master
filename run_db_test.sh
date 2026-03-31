#!/bin/bash
# 在 PostgreSQL 容器中运行测试

cat > /tmp/test_db.sql << 'EOF'
-- 测试 1: 检查表结构
SELECT '测试 1: 检查表结构' as test;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 测试 2: 检查默认管理员
SELECT '测试 2: 检查默认管理员账号' as test;
SELECT id, username, email, role, status, created_at
FROM users 
WHERE username = 'admin' AND deleted_at IS NULL;

-- 测试 3: 检查角色
SELECT '测试 3: 检查角色配置' as test;
SELECT name, description, permissions, created_at
FROM roles 
ORDER BY name;

-- 测试 4: 用户总数
SELECT '测试 4: 统计用户数量' as test;
SELECT COUNT(*) as total_users FROM users WHERE deleted_at IS NULL;

-- 测试 5: 检查 sessions 表
SELECT '测试 5: 检查 sessions 表' as test;
SELECT COUNT(*) as session_count FROM sessions;

-- 测试 6: 检查 login_logs 表
SELECT '测试 6: 检查 login_logs 表' as test;
SELECT COUNT(*) as log_count FROM login_logs;

-- 测试 7: 创建测试用户
SELECT '测试 7: 创建测试用户' as test;
INSERT INTO users (id, username, email, password_hash, display_name, role, status)
VALUES (
    gen_random_uuid(),
    'test_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'test_' || EXTRACT(EPOCH FROM NOW())::TEXT || '@test.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu',
    '测试用户',
    'user',
    'active'
) RETURNING id, username, created_at;

-- 测试 8: 查询用户列表
SELECT '测试 8: 查询用户列表 (前 10 个)' as test;
SELECT id, username, email, display_name, role, status, created_at
FROM users 
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 测试 9: 更新测试用户
SELECT '测试 9: 更新测试用户' as test;
UPDATE users 
SET display_name = '更新后的测试用户', updated_at = CURRENT_TIMESTAMP
WHERE username LIKE 'test_%' AND deleted_at IS NULL
RETURNING id, username, display_name, updated_at;

-- 测试 10: 软删除测试用户
SELECT '测试 10: 软删除测试用户' as test;
UPDATE users 
SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE username LIKE 'test_%' AND deleted_at IS NULL
RETURNING id, username, deleted_at;

-- 测试 11: 验证软删除后查询不到
SELECT '测试 11: 验证软删除' as test;
SELECT COUNT(*) as should_be_zero
FROM users 
WHERE username LIKE 'test_%' AND deleted_at IS NULL;

-- 测试 12: 恢复测试用户
SELECT '测试 12: 恢复测试用户' as test;
UPDATE users 
SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
WHERE username LIKE 'test_%' AND deleted_at IS NOT NULL
RETURNING id, username, deleted_at;

-- 测试 13: 验证恢复成功
SELECT '测试 13: 验证恢复成功' as test;
SELECT COUNT(*) as should_be_one
FROM users 
WHERE username LIKE 'test_%' AND deleted_at IS NULL;

-- 清理测试数据
SELECT '清理测试数据' as test;
DELETE FROM users WHERE username LIKE 'test_%';

EOF

# 在 PostgreSQL 容器中执行 SQL
docker exec postgresql psql -U user_xKQftk -d claw-master -f /tmp/test_db.sql 2>&1
