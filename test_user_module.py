#!/usr/bin/env python3
"""
用户管理模块功能测试脚本
测试所有 P0 优先级功能
"""

import asyncio
import asyncpg
import bcrypt
import uuid
from datetime import datetime

# 数据库配置
DB_CONFIG = {
    'host': 'postgresql',
    'port': 5432,
    'user': 'user_xKQftk',
    'password': 'password',
    'database': 'claw-master'
}

class TestRunner:
    def __init__(self):
        self.conn = None
        self.passed = 0
        self.failed = 0
        self.test_user_id = None
    
    async def connect(self):
        """连接数据库"""
        print("📡 连接数据库...")
        try:
            self.conn = await asyncpg.connect(**DB_CONFIG)
            print("✅ 数据库连接成功\n")
            return True
        except Exception as e:
            print(f"❌ 数据库连接失败：{e}\n")
            return False
    
    async def close(self):
        """关闭连接"""
        if self.conn:
            await self.conn.close()
    
    def log_test(self, name: str, success: bool, message: str = ""):
        """记录测试结果"""
        if success:
            print(f"  ✅ {name}")
            self.passed += 1
        else:
            print(f"  ❌ {name}: {message}")
            self.failed += 1
    
    async def test_1_check_tables(self):
        """测试 1: 检查表结构"""
        print("\n📋 测试 1: 检查数据库表结构")
        
        tables = await self.conn.fetch("""
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        
        expected_tables = ['users', 'roles', 'sessions', 'login_logs', 'active_users']
        found_tables = [t['table_name'] for t in tables]
        
        all_exist = all(t in found_tables for t in expected_tables)
        self.log_test("数据库表结构完整", all_exist, f"找到：{', '.join(found_tables)}")
        
        # 检查 users 表字段
        columns = await self.conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """)
        
        self.log_test(f"users 表有 {len(columns)} 个字段", len(columns) >= 10)
    
    async def test_2_check_default_user(self):
        """测试 2: 检查默认管理员账号"""
        print("\n👤 测试 2: 检查默认管理员账号")
        
        user = await self.conn.fetchrow("""
            SELECT id, username, email, role, status 
            FROM users 
            WHERE username = 'admin' AND deleted_at IS NULL
        """)
        
        if user:
            self.log_test("admin 账号存在", True)
            self.log_test(f"用户名：{user['username']}", True)
            self.log_test(f"角色：{user['role']}", user['role'] == 'admin')
            self.log_test(f"状态：{user['status']}", user['status'] == 'active')
            self.log_test(f"邮箱：{user['email']}", '@' in user['email'])
        else:
            self.log_test("admin 账号存在", False, "未找到管理员账号")
    
    async def test_3_check_roles(self):
        """测试 3: 检查角色配置"""
        print("\n👥 测试 3: 检查角色配置")
        
        roles = await self.conn.fetch("SELECT name, description FROM roles ORDER BY name")
        
        expected_roles = ['admin', 'user', 'guest']
        found_roles = [r['name'] for r in roles]
        
        for role_name in expected_roles:
            exists = role_name in found_roles
            self.log_test(f"角色 '{role_name}' 存在", exists)
        
        # 检查 admin 角色权限
        admin_role = await self.conn.fetchrow("SELECT permissions FROM roles WHERE name = 'admin'")
        if admin_role:
            perms = admin_role['permissions']
            self.log_test("admin 角色有权限配置", '*' in perms or len(perms) > 0)
    
    async def test_4_create_user(self):
        """测试 4: 创建测试用户"""
        print("\n➕ 测试 4: 创建测试用户")
        
        username = f"testuser_{uuid.uuid4().hex[:8]}"
        email = f"{username}@test.com"
        password = "Test@12345"
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        try:
            await self.conn.execute("""
                INSERT INTO users (id, username, email, password_hash, display_name, role, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'active')
                RETURNING id, username, created_at
            """, uuid.uuid4(), username, email, password_hash, '测试用户', 'user')
            
            self.log_test(f"创建用户 {username}", True)
            
            # 保存用户 ID 用于后续测试
            user_row = await self.conn.fetchrow("""
                SELECT id FROM users WHERE username = $1
            """, username)
            
            self.test_user_id = user_row['id']
            self.log_test("获取用户 ID", True, str(self.test_user_id))
            
        except Exception as e:
            self.log_test("创建测试用户", False, str(e))
    
    async def test_5_query_user(self):
        """测试 5: 查询用户"""
        print("\n🔍 测试 5: 查询用户")
        
        if not self.test_user_id:
            self.log_test("跳过查询测试（无测试用户）", False)
            return
        
        user = await self.conn.fetchrow("""
            SELECT id, username, email, display_name, role, status
            FROM users 
            WHERE id = $1 AND deleted_at IS NULL
        """, self.test_user_id)
        
        if user:
            self.log_test("查询用户成功", True)
            self.log_test(f"用户名：{user['username']}", True)
            self.log_test(f"显示名：{user['display_name']}", user['display_name'] == '测试用户')
        else:
            self.log_test("查询用户", False, "未找到测试用户")
    
    async def test_6_update_user(self):
        """测试 6: 更新用户"""
        print("\n✏️  测试 6: 更新用户信息")
        
        if not self.test_user_id:
            self.log_test("跳过更新测试（无测试用户）", False)
            return
        
        try:
            await self.conn.execute("""
                UPDATE users 
                SET display_name = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND deleted_at IS NULL
            """, self.test_user_id, '更新后的测试用户')
            
            # 验证更新
            user = await self.conn.fetchrow("""
                SELECT display_name FROM users WHERE id = $1
            """, self.test_user_id)
            
            self.log_test("更新用户成功", user['display_name'] == '更新后的测试用户')
            
        except Exception as e:
            self.log_test("更新用户", False, str(e))
    
    async def test_7_user_list(self):
        """测试 7: 用户列表分页查询"""
        print("\n📋 测试 7: 用户列表分页查询")
        
        try:
            # 查询总数
            total = await self.conn.fetchval("""
                SELECT COUNT(*) FROM users WHERE deleted_at IS NULL
            """)
            
            self.log_test(f"用户总数：{total}", total >= 1)
            
            # 分页查询
            users = await self.conn.fetch("""
                SELECT id, username, email, display_name, role, status, created_at
                FROM users 
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT 10 OFFSET 0
            """)
            
            self.log_test(f"查询到 {len(users)} 个用户", len(users) > 0)
            
        except Exception as e:
            self.log_test("用户列表查询", False, str(e))
    
    async def test_8_soft_delete(self):
        """测试 8: 软删除用户"""
        print("\n🗑️  测试 8: 软删除用户")
        
        if not self.test_user_id:
            self.log_test("跳过删除测试（无测试用户）", False)
            return
        
        try:
            # 软删除
            await self.conn.execute("""
                UPDATE users 
                SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND deleted_at IS NULL
            """, self.test_user_id)
            
            # 验证删除
            deleted_user = await self.conn.fetchrow("""
                SELECT id, deleted_at FROM users WHERE id = $1
            """, self.test_user_id)
            
            is_deleted = deleted_user and deleted_user['deleted_at'] is not None
            self.log_test("软删除成功", is_deleted)
            
            # 验证普通查询查不到
            active_user = await self.conn.fetchrow("""
                SELECT id FROM users 
                WHERE id = $1 AND deleted_at IS NULL
            """, self.test_user_id)
            
            self.log_test("删除后查询不到", active_user is None)
            
        except Exception as e:
            self.log_test("软删除用户", False, str(e))
    
    async def test_9_restore_user(self):
        """测试 9: 恢复已删除用户"""
        print("\n♻️  测试 9: 恢复已删除用户")
        
        if not self.test_user_id:
            self.log_test("跳过恢复测试（无测试用户）", False)
            return
        
        try:
            # 恢复
            await self.conn.execute("""
                UPDATE users 
                SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND deleted_at IS NOT NULL
            """, self.test_user_id)
            
            # 验证恢复
            user = await self.conn.fetchrow("""
                SELECT id, deleted_at FROM users 
                WHERE id = $1 AND deleted_at IS NULL
            """, self.test_user_id)
            
            self.log_test("恢复用户成功", user is not None)
            
        except Exception as e:
            self.log_test("恢复用户", False, str(e))
    
    async def test_10_password_verify(self):
        """测试 10: 密码验证"""
        print("\n🔐 测试 10: 密码验证")
        
        # 测试 admin 密码
        admin = await self.conn.fetchrow("""
            SELECT password_hash FROM users 
            WHERE username = 'admin' AND deleted_at IS NULL
        """)
        
        if admin:
            password = "Admin@123"
            is_valid = bcrypt.checkpw(password.encode('utf-8'), admin['password_hash'].encode('utf-8'))
            self.log_test("admin 密码验证", is_valid)
            
            # 测试错误密码
            wrong_password = "Wrong@123"
            is_invalid = not bcrypt.checkpw(wrong_password.encode('utf-8'), admin['password_hash'].encode('utf-8'))
            self.log_test("错误密码拒绝", is_invalid)
        else:
            self.log_test("密码验证", False, "未找到 admin 账号")
    
    async def test_11_session_table(self):
        """测试 11: 会话表结构"""
        print("\n🎫 测试 11: 会话表检查")
        
        columns = await self.conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sessions' 
            ORDER BY ordinal_position
        """)
        
        self.log_test(f"sessions 表有 {len(columns)} 个字段", len(columns) >= 5)
        
        # 检查关键字段
        column_names = [c['column_name'] for c in columns]
        required = ['user_id', 'token', 'expires_at']
        for col in required:
            self.log_test(f"字段 '{col}' 存在", col in column_names)
    
    async def test_12_login_logs(self):
        """测试 12: 登录日志表"""
        print("\n📝 测试 12: 登录日志表检查")
        
        columns = await self.conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'login_logs' 
            ORDER BY ordinal_position
        """)
        
        self.log_test(f"login_logs 表有 {len(columns)} 个字段", len(columns) >= 5)
        
        # 检查关键字段
        column_names = [c['column_name'] for c in columns]
        required = ['username', 'success', 'ip_address']
        for col in required:
            self.log_test(f"字段 '{col}' 存在", col in column_names)
    
    async def run_all_tests(self):
        """运行所有测试"""
        print("=" * 70)
        print("  🧪 OpenClaw 用户管理模块功能测试")
        print("=" * 70)
        
        if not await self.connect():
            return
        
        try:
            # 执行测试
            await self.test_1_check_tables()
            await self.test_2_check_default_user()
            await self.test_3_check_roles()
            await self.test_4_create_user()
            await self.test_5_query_user()
            await self.test_6_update_user()
            await self.test_7_user_list()
            await self.test_8_soft_delete()
            await self.test_9_restore_user()
            await self.test_10_password_verify()
            await self.test_11_session_table()
            await self.test_12_login_logs()
            
        finally:
            await self.close()
        
        # 测试总结
        print("\n" + "=" * 70)
        print("  📊 测试总结")
        print("=" * 70)
        print(f"  ✅ 通过：{self.passed}")
        print(f"  ❌ 失败：{self.failed}")
        print(f"  📝 总计：{self.passed + self.failed}")
        print()
        
        if self.failed == 0:
            print("  🎉 所有测试通过！")
        else:
            print(f"  ⚠️  有 {self.failed} 个测试失败")
        
        print()


# 运行测试
if __name__ == '__main__':
    runner = TestRunner()
    asyncio.run(runner.run_all_tests())
