-- ============================================================================
-- 组织架构扩展脚本
-- 功能：部门管理、用户部门关联
-- 版本：v0.3.0
-- 日期：2026-03-31
-- ============================================================================

-- ============================================================================
-- 1. 部门表（departments）
-- ============================================================================

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id) WHERE deleted_at IS NULL;

-- 添加注释

-- ============================================================================
-- 2. 用户部门关联表（user_departments）
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, department_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_dept_id ON user_departments(department_id);

-- 添加注释

-- ============================================================================
-- 3. 部门层级查询视图（递归）
-- ============================================================================

CREATE OR REPLACE VIEW department_tree AS
WITH RECURSIVE dept_path AS (
    -- 顶层部门
    SELECT 
        id, 
        name, 
        code, 
        parent_id, 
        manager_id,
        sort_order,
        status,
        description,
        created_at,
        updated_at,
        0 as level,
        ARRAY[id] as path,
        CAST(name AS TEXT) as full_name
    FROM departments
    WHERE parent_id IS NULL AND deleted_at IS NULL
    
    UNION ALL
    
    -- 递归子部门
    SELECT 
        d.id, 
        d.name, 
        d.code, 
        d.parent_id, 
        d.manager_id,
        d.sort_order,
        d.status,
        d.description,
        d.created_at,
        d.updated_at,
        dp.level + 1,
        dp.path || d.id,
        dp.full_name || ' > ' || d.name
    FROM departments d
    JOIN dept_path dp ON d.parent_id = dp.id
    WHERE d.deleted_at IS NULL
)
SELECT * FROM dept_path
ORDER BY path;


-- ============================================================================
-- 4. 部门统计视图
-- ============================================================================

CREATE OR REPLACE VIEW department_stats AS
SELECT 
    d.id,
    d.name,
    d.code,
    d.parent_id,
    d.status,
    COUNT(ud.user_id) as user_count,
    COUNT(CASE WHEN ud.is_primary THEN 1 END) as primary_user_count
FROM departments d
LEFT JOIN user_departments ud ON d.id = ud.department_id
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.name, d.code, d.parent_id, d.status;


-- ============================================================================
-- 5. 更新时间戳触发器
-- ============================================================================

CREATE OR REPLACE FUNCTION update_department_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_department_updated_at();

-- ============================================================================
-- 6. 初始化默认部门
-- ============================================================================

INSERT INTO departments (id, name, code, description, sort_order, status) VALUES
    ('00000000-0000-0000-0000-000000000001', '总公司', 'HEAD', '公司总部', 0, 'active'),
    ('00000000-0000-0000-0000-000000000002', '技术部', 'TECH', '技术研发部门', 1, 'active'),
    ('00000000-0000-0000-0000-000000000003', '产品部', 'PROD', '产品管理部门', 2, 'active'),
    ('00000000-0000-0000-0000-000000000004', '运营部', 'OPS', '运营部门', 3, 'active'),
    ('00000000-0000-0000-0000-000000000005', '市场部', 'MKT', '市场部门', 4, 'active'),
    ('00000000-0000-0000-0000-000000000006', '人力资源部', 'HR', '人力资源部门', 5, 'active'),
    ('00000000-0000-0000-0000-000000000007', '财务部', 'FIN', '财务部门', 6, 'active')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

-- 设置部门层级关系
UPDATE departments SET parent_id = '00000000-0000-0000-0000-000000000001' 
WHERE code IN ('TECH', 'PROD', 'OPS', 'MKT', 'HR', 'FIN') AND parent_id IS NULL;

-- ============================================================================
-- 7. 权限定义表（可选，用于管理权限元数据）
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认权限（如果不存在）
INSERT INTO permissions (code, name, description, category) VALUES
    ('user:create', '创建用户', '可以创建新用户', '用户管理'),
    ('user:read', '查看用户', '可以查看用户信息', '用户管理'),
    ('user:update', '更新用户', '可以修改用户信息', '用户管理'),
    ('user:delete', '删除用户', '可以删除用户', '用户管理'),
    ('role:create', '创建角色', '可以创建新角色', '角色管理'),
    ('role:read', '查看角色', '可以查看角色信息', '角色管理'),
    ('role:update', '更新角色', '可以修改角色信息', '角色管理'),
    ('role:delete', '删除角色', '可以删除角色', '角色管理'),
    ('dept:create', '创建部门', '可以创建新部门', '组织架构'),
    ('dept:read', '查看部门', '可以查看部门信息', '组织架构'),
    ('dept:update', '更新部门', '可以修改部门信息', '组织架构'),
    ('dept:delete', '删除部门', '可以删除部门', '组织架构'),
    ('system:config', '系统配置', '可以修改系统配置', '系统管理'),
    ('system:log', '查看日志', '可以查看系统日志', '系统管理'),
    ('data:export', '数据导出', '可以导出数据', '数据管理'),
    ('data:import', '数据导入', '可以导入数据', '数据管理')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 8. 更新 admin 角色权限（添加部门管理权限）
-- ============================================================================

UPDATE roles 
SET permissions = '["*"]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'admin';

-- ============================================================================
-- 完成提示
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ 组织架构扩展脚本执行完成';
    RAISE NOTICE '   - 创建表：departments, user_departments, permissions';
    RAISE NOTICE '   - 创建视图：department_tree, department_stats';
    RAISE NOTICE '   - 初始化部门：7 个默认部门';
    RAISE NOTICE '   - 初始化权限：16 个默认权限';
END $$;
