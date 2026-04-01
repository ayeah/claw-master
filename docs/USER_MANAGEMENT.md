# 用户管理模块详细功能清单

📅 生成时间：2026-03-31  
📂 所属层级：基础模块层 → 用户管理子域  
🔧 状态：部分实现（需扩展）

---

## 一、模块概览

```
用户管理模块
├── 用户管理（User Management）
├── 组织架构（Organization）
├── 角色管理（Role Management）
└── 权限管理（Permission Management）
```

---

## 二、用户管理（User Management）

### 2.1 用户基础信息

| 字段 | 类型 | 必填 | 说明 | 验证规则 |
|------|------|------|------|----------|
| `id` | UUID | 系统生成 | 用户唯一标识 | 自动生成 |
| `username` | VARCHAR(50) | ✅ | 登录用户名 | 唯一，3-50 字符 |
| `email` | VARCHAR(255) | ✅ | 邮箱地址 | 唯一，有效邮箱格式 |
| `password_hash` | VARCHAR(255) | ✅ | 密码哈希 | bcrypt 12 轮 |
| `display_name` | VARCHAR(100) | 可选 | 显示名称 | 最大 100 字符 |
| `avatar_url` | VARCHAR(500) | 可选 | 头像 URL | 有效 URL 格式 |
| `role` | VARCHAR(50) | ✅ | 角色标识 | admin/user/guest |
| `status` | VARCHAR(20) | ✅ | 账号状态 | active/inactive/banned |
| `last_login_at` | TIMESTAMP | 系统生成 | 最后登录时间 | 自动更新 |
| `last_login_ip` | VARCHAR(45) | 系统生成 | 最后登录 IP | IPv4/IPv6 |
| `created_at` | TIMESTAMP | 系统生成 | 创建时间 | 自动记录 |
| `updated_at` | TIMESTAMP | 系统生成 | 更新时间 | 触发器自动更新 |
| `deleted_at` | TIMESTAMP | 系统生成 | 删除时间 | 软删除标记 |

### 2.2 用户 CRUD 功能

#### 2.2.1 创建用户

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 基础信息录入 | 用户名、邮箱、密码、显示名称 | P0 |
| 密码强度校验 | 最少 8 位，包含大小写字母和数字 | P0 |
| 唯一性检查 | 用户名和邮箱全局唯一 | P0 |
| 默认角色分配 | 默认分配 user 角色 | P0 |
| 默认状态设置 | 默认 active 状态 | P0 |
| 创建日志记录 | 记录创建人、创建时间 | P1 |
| 欢迎邮件发送 | 发送账号激活邮件 | P2 |
| 批量导入 | 支持 CSV/Excel 批量导入 | P2 |

#### 2.2.2 查询用户

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 按 ID 查询 | 根据用户 ID 获取详情 | P0 |
| 按用户名查询 | 支持精确/模糊查询 | P0 |
| 按邮箱查询 | 支持精确/模糊查询 | P0 |
| 按状态筛选 | active/inactive/banned | P0 |
| 按角色筛选 | admin/user/guest | P0 |
| 分页查询 | 支持 page/size 参数 | P0 |
| 排序 | 按创建时间/最后登录时间 | P1 |
| 高级搜索 | 组合条件查询 | P1 |
| 活跃用户视图 | 查询 active 且未删除的用户 | P0 |

#### 2.2.3 更新用户

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 修改显示名称 | 更新 display_name | P0 |
| 修改邮箱 | 需验证新邮箱唯一性 | P0 |
| 修改密码 | 需验证原密码，新密码强度校验 | P0 |
| 修改头像 | 更新 avatar_url | P1 |
| 修改角色 | 仅限管理员操作 | P0 |
| 修改状态 | 激活/禁用/封禁账号 | P0 |
| 更新时间戳 | 自动触发器更新 | P0 |
| 修改日志 | 记录变更内容和操作人 | P1 |

#### 2.2.4 删除用户

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 软删除 | 设置 deleted_at，不物理删除 | P0 |
| 删除检查 | 检查是否有关联数据 | P1 |
| 恢复功能 | 清除 deleted_at 恢复账号 | P1 |
| 批量删除 | 支持多选批量软删除 | P2 |
| 物理删除 | 管理员强制物理删除（慎用） | P3 |

### 2.3 用户认证功能

| 功能点 | 说明 | 状态 | 文件位置 |
|--------|------|------|----------|
| 用户名登录 | 支持用户名或邮箱登录 | ✅ 已实现 | auth.py |
| 密码验证 | bcrypt 密码比对 | ✅ 已实现 | user.py |
| 会话创建 | 生成 UUID 令牌，7 天有效期 | ✅ 已实现 | auth.py |
| 会话验证 | 验证令牌有效性和过期时间 | ✅ 已实现 | auth.py |
| 登出功能 | 撤销会话令牌 | ✅ 已实现 | auth.py |
| 登录日志 | 记录成功/失败日志 | ✅ 已实现 | auth.py |
| 失败原因记录 | user_not_found/invalid_password/account_banned | ✅ 已实现 | auth.py |
| 最后登录更新 | 更新 last_login_at 和 last_login_ip | ✅ 已实现 | auth.py |
| 账号状态检查 | 登录时检查 active 状态 | ✅ 已实现 | auth.py |
| 记住我功能 | 延长会话有效期 | ⏳ 待实现 | - |
| 多设备登录 | 支持多会话并发 | ⏳ 待实现 | - |
| 登录限流 | 防止暴力破解 | ⏳ 待实现 | - |
| 验证码 | 连续失败后要求验证码 | ⏳ 待实现 | - |

### 2.4 用户安全功能

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 密码加密存储 | bcrypt 12 轮哈希 | P0 |
| 密码强度策略 | 最少 8 位，复杂度要求 | P0 |
| 会话令牌安全 | secrets.token_urlsafe(32) | P0 |
| Cookie HttpOnly | 防止 XSS 窃取会话 | P0 |
| 账号禁用 | 支持 inactive/banned 状态 | P0 |
| 软删除保护 | deleted_at 标记，防止误删 | P0 |
| 登录失败锁定 | 连续失败 N 次后锁定账号 | P1 |
| 密码过期策略 | 定期强制修改密码 | P2 |
| 异地登录提醒 | 检测异常 IP 登录 | P2 |
| 双因素认证 | TOTP/SMS 验证 | P2 |

---

## 三、组织架构（Organization）

### 3.1 当前状态

⚠️ **尚未实现** - 需要在数据库中新增以下表结构

### 3.2 建议表结构

#### 3.2.1 部门表（departments）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | UUID | ✅ | 部门唯一标识 |
| `name` | VARCHAR(100) | ✅ | 部门名称 |
| `code` | VARCHAR(50) | ✅ | 部门编码（唯一） |
| `parent_id` | UUID | 可选 | 父部门 ID（支持多级） |
| `manager_id` | UUID | 可选 | 部门负责人 ID |
| `sort_order` | INTEGER | ✅ | 排序序号 |
| `status` | VARCHAR(20) | ✅ | 状态：active/inactive |
| `description` | TEXT | 可选 | 部门描述 |
| `created_at` | TIMESTAMP | ✅ | 创建时间 |
| `updated_at` | TIMESTAMP | ✅ | 更新时间 |
| `deleted_at` | TIMESTAMP | 可选 | 软删除标记 |

#### 3.2.2 用户部门关联表（user_departments）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | UUID | ✅ | 唯一标识 |
| `user_id` | UUID | ✅ | 用户 ID |
| `department_id` | UUID | ✅ | 部门 ID |
| `is_primary` | BOOLEAN | ✅ | 是否主部门 |
| `joined_at` | TIMESTAMP | ✅ | 加入时间 |
| `created_at` | TIMESTAMP | ✅ | 记录创建时间 |

### 3.3 组织架构功能清单

| 功能模块 | 功能点 | 说明 | 优先级 |
|----------|--------|------|--------|
| **部门管理** | 创建部门 | 支持多级部门树 | P1 |
| | 编辑部门 | 修改名称、编码、负责人 | P1 |
| | 删除部门 | 软删除，检查子部门 | P1 |
| | 部门树查询 | 递归查询完整树结构 | P1 |
| | 部门移动 | 调整父部门（调整层级） | P2 |
| | 部门排序 | 调整 sort_order | P1 |
| **用户部门关联** | 分配部门 | 将用户分配到部门 | P1 |
| | 多部门支持 | 一个用户可属于多个部门 | P2 |
| | 主部门设置 | 标记一个主部门 | P1 |
| | 部门成员查询 | 查询部门下所有用户 | P1 |
| | 调岗记录 | 记录部门变更历史 | P2 |
| **部门统计** | 人数统计 | 各部门人数统计 | P1 |
| | 架构可视化 | 树形架构图展示 | P2 |

---

## 四、角色管理（Role Management）

### 4.1 当前实现

✅ **已部分实现** - 基础表结构和默认角色已创建

#### 4.1.1 角色表结构（roles）

| 字段 | 类型 | 说明 | 状态 |
|------|------|------|------|
| `id` | UUID | 角色唯一标识 | ✅ |
| `name` | VARCHAR(50) | 角色名称（唯一） | ✅ |
| `description` | VARCHAR(255) | 角色描述 | ✅ |
| `permissions` | JSONB | 权限列表（JSON 数组） | ✅ |
| `created_at` | TIMESTAMP | 创建时间 | ✅ |
| `updated_at` | TIMESTAMP | 更新时间 | ✅（触发器） |

#### 4.1.2 默认角色

| 角色名 | 说明 | 权限 |
|--------|------|------|
| `admin` | 系统管理员 | `["*"]` - 全部权限 |
| `user` | 普通用户 | `["read", "write"]` |
| `guest` | 访客 | `["read"]` |

### 4.2 角色管理功能清单

| 功能模块 | 功能点 | 说明 | 优先级 | 状态 |
|----------|--------|------|--------|------|
| **角色 CRUD** | 创建角色 | 定义角色名称、描述、权限 | P1 | ⏳ |
| | 查询角色 | 列表查询、详情查询 | P1 | ⏳ |
| | 编辑角色 | 修改角色信息和权限 | P1 | ⏳ |
| | 删除角色 | 软删除，检查关联用户 | P1 | ⏳ |
| | 角色复制 | 基于现有角色快速创建 | P2 | ⏳ |
| **角色分配** | 分配角色给用户 | 更新用户 role 字段 | P0 | ✅（基础） |
| | 批量分配 | 多选用户批量分配角色 | P2 | ⏳ |
| | 角色回收 | 移除用户角色（降级到 guest） | P1 | ⏳ |
| **角色统计** | 角色用户数 | 统计每个角色的用户数量 | P1 | ⏳ |
| | 角色使用情况 | 分析角色使用频率 | P2 | ⏳ |
| **系统角色保护** | 内置角色保护 | admin/user/guest 不可删除 | P1 | ⏳ |
| | 角色变更日志 | 记录角色变更历史 | P2 | ⏳ |

---

## 五、权限管理（Permission Management）

### 5.1 当前状态

⚠️ **基础框架已建，需完善实现**

### 5.2 权限模型设计

#### 5.2.1 权限定义

采用 **资源 + 操作** 的权限命名规范：

```
格式：{resource}:{action}

示例：
- user:create     创建用户
- user:read       查看用户
- user:update     更新用户
- user:delete     删除用户
- role:manage     角色管理
- dept:manage     部门管理
- system:*        系统全部权限
```

#### 5.2.2 权限分类

| 分类 | 权限标识 | 说明 |
|------|----------|------|
| **用户权限** | user:create, user:read, user:update, user:delete | 用户管理 |
| **角色权限** | role:create, role:read, role:update, role:delete | 角色管理 |
| **部门权限** | dept:create, dept:read, dept:update, dept:delete | 部门管理 |
| **系统权限** | system:config, system:log, system:backup | 系统管理 |
| **数据权限** | data:export, data:import, data:audit | 数据管理 |
| **通配符** | * | 匹配所有权限 |

### 5.3 权限检查机制

#### 5.3.1 当前实现

```sql
-- 简化的权限检查函数（需完善）
CREATE OR REPLACE FUNCTION check_user_permission(required_permission VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    user_roles JSONB;
BEGIN
    -- 这里简化实现，实际应该根据当前用户查询角色权限
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 5.3.2 建议实现方案

**方案 A：基于角色的权限检查（RBAC）**

```sql
-- 获取用户权限列表
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_role VARCHAR;
    role_perms JSONB;
BEGIN
    -- 查询用户角色
    SELECT role INTO user_role FROM users WHERE id = user_id;
    
    -- 查询角色权限
    SELECT permissions INTO role_perms FROM roles WHERE name = user_role;
    
    RETURN role_perms;
END;
$$ LANGUAGE plpgsql;

-- 检查用户是否有指定权限
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, permission VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    perms JSONB;
BEGIN
    perms := get_user_permissions(user_id);
    
    -- 检查是否有通配符权限
    IF perms ? '*' THEN
        RETURN true;
    END IF;
    
    -- 检查是否有具体权限
    RETURN perms ? permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**方案 B：Python 层权限装饰器**

```python
# 权限装饰器示例
def require_permission(permission: str):
    def decorator(func):
        async def wrapper(request, *args, **kwargs):
            token = request.cookies.get('session_token')
            user = await AuthService.get_current_user(token)
            
            if not user:
                return web.json_response({'error': '未登录'}, status=401)
            
            # 检查权限
            has_perm = await PermissionService.check_permission(user['id'], permission)
            if not has_perm:
                return web.json_response({'error': '权限不足'}, status=403)
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

# 使用示例
@require_permission('user:create')
async def api_create_user(request):
    # 创建用户逻辑
    pass
```

### 5.4 权限管理功能清单

| 功能模块 | 功能点 | 说明 | 优先级 | 状态 |
|----------|--------|------|--------|------|
| **权限定义** | 权限列表查询 | 获取系统所有可用权限 | P1 | ⏳ |
| | 权限分组管理 | 按模块分组权限 | P1 | ⏳ |
| | 权限描述 | 每个权限的详细说明 | P1 | ⏳ |
| **权限分配** | 角色权限关联 | 为角色分配权限 | P0 | ⏳ |
| | 批量权限分配 | 一次性分配多个权限 | P1 | ⏳ |
| | 权限继承 | 角色权限继承机制 | P2 | ⏳ |
| **权限检查** | 实时权限验证 | 接口级权限检查 | P0 | ⏳ |
| | 权限缓存 | 缓存用户权限提高性能 | P1 | ⏳ |
| | 权限变更通知 | 权限变更后通知相关用户 | P2 | ⏳ |
| **权限审计** | 权限使用日志 | 记录权限使用情况 | P2 | ⏳ |
| | 权限变更历史 | 记录权限分配历史 | P1 | ⏳ |

---

## 六、API 接口设计（建议）

### 6.1 用户管理 API

| 方法 | 路径 | 说明 | 权限要求 |
|------|------|------|----------|
| POST | `/api/users` | 创建用户 | user:create |
| GET | `/api/users` | 用户列表（分页） | user:read |
| GET | `/api/users/:id` | 用户详情 | user:read |
| PUT | `/api/users/:id` | 更新用户 | user:update |
| DELETE | `/api/users/:id` | 删除用户（软删除） | user:delete |
| POST | `/api/users/:id/password` | 修改密码 | user:update |
| POST | `/api/users/:id/activate` | 激活用户 | user:update |
| POST | `/api/users/:id/ban` | 封禁用户 | user:update |
| POST | `/api/users/import` | 批量导入用户 | user:create |
| POST | `/api/users/export` | 导出用户数据 | data:export |

### 6.2 组织架构 API

| 方法 | 路径 | 说明 | 权限要求 |
|------|------|------|----------|
| GET | `/api/departments` | 部门树查询 | dept:read |
| POST | `/api/departments` | 创建部门 | dept:create |
| PUT | `/api/departments/:id` | 更新部门 | dept:update |
| DELETE | `/api/departments/:id` | 删除部门 | dept:delete |
| POST | `/api/departments/:id/users` | 添加部门成员 | dept:update |
| DELETE | `/api/departments/:id/users/:userId` | 移除部门成员 | dept:update |
| GET | `/api/departments/:id/users` | 查询部门成员 | dept:read |

### 6.3 角色管理 API

| 方法 | 路径 | 说明 | 权限要求 |
|------|------|------|----------|
| GET | `/api/roles` | 角色列表 | role:read |
| POST | `/api/roles` | 创建角色 | role:create |
| PUT | `/api/roles/:id` | 更新角色 | role:update |
| DELETE | `/api/roles/:id` | 删除角色 | role:delete |
| GET | `/api/roles/:id/users` | 查询角色用户 | role:read |
| POST | `/api/roles/:id/permissions` | 分配权限 | role:update |

### 6.4 权限管理 API

| 方法 | 路径 | 说明 | 权限要求 |
|------|------|------|----------|
| GET | `/api/permissions` | 权限列表 | system:config |
| GET | `/api/users/:id/permissions` | 用户权限查询 | role:read |
| POST | `/api/users/:id/permissions/check` | 权限检查 | - |

---

## 七、数据库扩展脚本（建议）

### 7.1 组织架构表

```sql
-- 部门表
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    parent_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES users(id),
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 用户部门关联表
CREATE TABLE IF NOT EXISTS user_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, department_id)
);

-- 部门层级查询视图（递归）
CREATE OR REPLACE VIEW department_tree AS
WITH RECURSIVE dept_path AS (
    SELECT id, name, code, parent_id, 0 as level,
           ARRAY[id] as path
    FROM departments
    WHERE parent_id IS NULL AND deleted_at IS NULL
    
    UNION ALL
    
    SELECT d.id, d.name, d.code, d.parent_id, dp.level + 1,
           dp.path || d.id
    FROM departments d
    JOIN dept_path dp ON d.parent_id = dp.id
    WHERE d.deleted_at IS NULL
)
SELECT * FROM dept_path;
```

### 7.2 权限增强表

```sql
-- 权限定义表（可选，用于管理权限元数据）
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认权限
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
```

---

## 八、开发优先级建议

| 阶段 | 模块 | 功能 | 预计工时 |
|------|------|------|----------|
| **P0** | 用户管理 | 完善 CRUD、密码策略、登录限流 | 3 天 |
| **P0** | 权限管理 | 权限检查装饰器、角色权限关联 | 2 天 |
| **P1** | 组织架构 | 部门表、用户部门关联、部门树 | 3 天 |
| **P1** | 角色管理 | 角色 CRUD、权限分配界面 | 2 天 |
| **P2** | 安全增强 | 双因素认证、登录异常检测 | 3 天 |
| **P2** | 审计日志 | 操作日志、权限使用日志 | 2 天 |

---

## 九、相关文件位置

| 文件 | 路径 | 说明 |
|------|------|------|
| 用户模型 | `backend/models/user.py` | User/Session 数据类 |
| 认证服务 | `backend/services/auth.py` | 登录/登出/会话验证 |
| 数据库配置 | `backend/config/database.py` | 数据库连接配置 |
| 数据库模块 | `backend/db.py` | SQL 执行封装 |
| 数据库 Schema | `database/init.sql` | 表结构定义 |
| 主应用 | `backend/main.py` | API 路由定义 |

---

*文档维护：IT-Team Agent*  
*最后更新：2026-03-31*
