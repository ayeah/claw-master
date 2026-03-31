#!/usr/bin/env node
/**
 * 数据库功能测试脚本
 * 测试用户管理模块的所有数据库操作
 */

const { Client } = require('pg');

// 数据库配置
const dbConfig = {
    host: 'postgresql',
    port: 5432,
    user: 'user_xKQftk',
    password: 'password_yP7FCG',
    database: 'claw-master'
};

let client;
let passed = 0;
let failed = 0;
let testUserId = null;

function logTest(name, success, message = '') {
    if (success) {
        console.log(`  ✅ ${name}`);
        passed++;
    } else {
        console.log(`  ❌ ${name}: ${message}`);
        failed++;
    }
}

async function runTests() {
    console.log('='.repeat(70));
    console.log('  🧪 OpenClaw 用户管理模块数据库测试');
    console.log('='.repeat(70));
    console.log();
    
    try {
        // 连接数据库
        console.log('📡 连接数据库...');
        client = new Client(dbConfig);
        await client.connect();
        console.log('  ✅ 数据库连接成功\n');
        
        // 测试 1: 检查表结构
        console.log('📋 测试 1: 检查数据库表结构');
        const tablesResult = await client.query(`
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        const tables = tablesResult.rows.map(r => r.table_name);
        const expectedTables = ['users', 'roles', 'sessions', 'login_logs', 'active_users'];
        const allExist = expectedTables.every(t => tables.includes(t));
        
        logTest(`数据库表结构完整`, allExist, `找到：${tables.join(', ')}`);
        console.log();
        
        // 测试 2: 检查 users 表字段
        console.log('📋 测试 2: 检查 users 表字段');
        const columnsResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        const columns = columnsResult.rows;
        logTest(`users 表有 ${columns.length} 个字段`, columns.length >= 10);
        
        const columnNames = columns.map(c => c.column_name);
        const requiredColumns = ['id', 'username', 'email', 'password_hash', 'role', 'status', 'created_at', 'deleted_at'];
        requiredColumns.forEach(col => {
            logTest(`字段 '${col}' 存在`, columnNames.includes(col));
        });
        console.log();
        
        // 测试 3: 检查默认管理员账号
        console.log('👤 测试 3: 检查默认管理员账号');
        const adminResult = await client.query(`
            SELECT id, username, email, role, status, created_at 
            FROM users 
            WHERE username = 'admin' AND deleted_at IS NULL
        `);
        
        if (adminResult.rows.length > 0) {
            const admin = adminResult.rows[0];
            logTest('admin 账号存在', true);
            logTest(`用户名：${admin.username}`, true);
            logTest(`角色：${admin.role}`, admin.role === 'admin');
            logTest(`状态：${admin.status}`, admin.status === 'active');
            logTest(`邮箱：${admin.email}`, admin.email.includes('@'));
        } else {
            logTest('admin 账号存在', false, '未找到管理员账号');
        }
        console.log();
        
        // 测试 4: 检查角色配置
        console.log('👥 测试 4: 检查角色配置');
        const rolesResult = await client.query(`
            SELECT name, description, permissions 
            FROM roles 
            ORDER BY name
        `);
        
        const roles = rolesResult.rows;
        const roleNames = roles.map(r => r.name);
        const expectedRoles = ['admin', 'user', 'guest'];
        
        expectedRoles.forEach(roleName => {
            logTest(`角色 '${roleName}' 存在`, roleNames.includes(roleName));
        });
        
        // 检查 admin 角色权限
        const adminRole = roles.find(r => r.name === 'admin');
        if (adminRole) {
            const perms = adminRole.permissions;
            const hasPerms = Array.isArray(perms) ? perms.length > 0 : perms === '*';
            logTest('admin 角色有权限配置', hasPerms);
        }
        console.log();
        
        // 测试 5: 创建测试用户
        console.log('➕ 测试 5: 创建测试用户');
        const timestamp = Date.now();
        const testUsername = `testuser_${timestamp}`;
        const testEmail = `${testUsername}@test.com`;
        const testPassword = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu'; // Test@12345
        
        try {
            const createUserResult = await client.query(`
                INSERT INTO users (id, username, email, password_hash, display_name, role, status)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
                RETURNING id, username, created_at
            `, [testUsername, testEmail, testPassword, '测试用户', 'user', 'active']);
            
            const newUser = createUserResult.rows[0];
            logTest(`创建用户 ${testUsername}`, true);
            logTest('获取用户 ID', true, newUser.id);
            testUserId = newUser.id;
        } catch (error) {
            logTest('创建测试用户', false, error.message);
        }
        console.log();
        
        // 测试 6: 查询用户
        console.log('🔍 测试 6: 查询用户');
        if (testUserId) {
            const queryUserResult = await client.query(`
                SELECT id, username, email, display_name, role, status
                FROM users 
                WHERE id = $1 AND deleted_at IS NULL
            `, [testUserId]);
            
            if (queryUserResult.rows.length > 0) {
                const user = queryUserResult.rows[0];
                logTest('查询用户成功', true);
                logTest(`用户名：${user.username}`, true);
                logTest(`显示名：${user.display_name}`, user.display_name === '测试用户');
            } else {
                logTest('查询用户', false, '未找到测试用户');
            }
        } else {
            logTest('跳过查询测试', false, '无测试用户 ID');
        }
        console.log();
        
        // 测试 7: 更新用户
        console.log('✏️  测试 7: 更新用户信息');
        if (testUserId) {
            try {
                await client.query(`
                    UPDATE users 
                    SET display_name = $2, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1 AND deleted_at IS NULL
                `, [testUserId, '更新后的测试用户']);
                
                const verifyResult = await client.query(`
                    SELECT display_name FROM users WHERE id = $1
                `, [testUserId]);
                
                const updated = verifyResult.rows[0];
                logTest('更新用户成功', updated.display_name === '更新后的测试用户');
            } catch (error) {
                logTest('更新用户', false, error.message);
            }
        } else {
            logTest('跳过更新测试', false, '无测试用户 ID');
        }
        console.log();
        
        // 测试 8: 用户列表分页查询
        console.log('📋 测试 8: 用户列表分页查询');
        try {
            const totalResult = await client.query(`
                SELECT COUNT(*) FROM users WHERE deleted_at IS NULL
            `);
            const total = parseInt(totalResult.rows[0].count);
            logTest(`用户总数：${total}`, total >= 1);
            
            const listResult = await client.query(`
                SELECT id, username, email, display_name, role, status, created_at
                FROM users 
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT 10 OFFSET 0
            `);
            
            logTest(`查询到 ${listResult.rows.length} 个用户`, listResult.rows.length > 0);
        } catch (error) {
            logTest('用户列表查询', false, error.message);
        }
        console.log();
        
        // 测试 9: 软删除用户
        console.log('🗑️  测试 9: 软删除用户');
        if (testUserId) {
            try {
                await client.query(`
                    UPDATE users 
                    SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1 AND deleted_at IS NULL
                `, [testUserId]);
                
                const deletedResult = await client.query(`
                    SELECT id, deleted_at FROM users WHERE id = $1
                `, [testUserId]);
                
                const isDeleted = deletedResult.rows[0] && deletedResult.rows[0].deleted_at;
                logTest('软删除成功', isDeleted);
                
                // 验证普通查询查不到
                const activeResult = await client.query(`
                    SELECT id FROM users 
                    WHERE id = $1 AND deleted_at IS NULL
                `, [testUserId]);
                
                logTest('删除后查询不到', activeResult.rows.length === 0);
            } catch (error) {
                logTest('软删除用户', false, error.message);
            }
        } else {
            logTest('跳过删除测试', false, '无测试用户 ID');
        }
        console.log();
        
        // 测试 10: 恢复已删除用户
        console.log('♻️  测试 10: 恢复已删除用户');
        if (testUserId) {
            try {
                await client.query(`
                    UPDATE users 
                    SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1 AND deleted_at IS NOT NULL
                `, [testUserId]);
                
                const restoredResult = await client.query(`
                    SELECT id, deleted_at FROM users 
                    WHERE id = $1 AND deleted_at IS NULL
                `, [testUserId]);
                
                logTest('恢复用户成功', restoredResult.rows.length > 0);
            } catch (error) {
                logTest('恢复用户', false, error.message);
            }
        } else {
            logTest('跳过恢复测试', false, '无测试用户 ID');
        }
        console.log();
        
        // 测试 11: 检查 sessions 表
        console.log('🎫 测试 11: 检查 sessions 表');
        const sessionsColumnsResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sessions' 
            ORDER BY ordinal_position
        `);
        
        const sessionsColumns = sessionsColumnsResult.rows;
        logTest(`sessions 表有 ${sessionsColumns.length} 个字段`, sessionsColumns.length >= 5);
        
        const sessionColumnNames = sessionsColumns.map(c => c.column_name);
        const requiredSessionColumns = ['user_id', 'token', 'expires_at'];
        requiredSessionColumns.forEach(col => {
            logTest(`字段 '${col}' 存在`, sessionColumnNames.includes(col));
        });
        console.log();
        
        // 测试 12: 检查 login_logs 表
        console.log('📝 测试 12: 检查 login_logs 表');
        const logsColumnsResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'login_logs' 
            ORDER BY ordinal_position
        `);
        
        const logsColumns = logsColumnsResult.rows;
        logTest(`login_logs 表有 ${logsColumns.length} 个字段`, logsColumns.length >= 5);
        
        const logsColumnNames = logsColumns.map(c => c.column_name);
        const requiredLogColumns = ['username', 'success', 'ip_address'];
        requiredLogColumns.forEach(col => {
            logTest(`字段 '${col}' 存在`, logsColumnNames.includes(col));
        });
        console.log();
        
        // 清理测试数据
        console.log('🧹 清理测试数据...');
        if (testUserId) {
            try {
                await client.query(`DELETE FROM users WHERE id = $1`, [testUserId]);
                logTest('清理测试用户', true);
            } catch (error) {
                logTest('清理测试用户', false, error.message);
            }
        }
        console.log();
        
    } catch (error) {
        console.log(`\n❌ 测试中断：${error.message}\n`);
        console.log(error.stack);
    } finally {
        // 关闭连接
        if (client) {
            await client.end();
        }
        
        // 测试总结
        console.log('='.repeat(70));
        console.log('  📊 测试总结');
        console.log('='.repeat(70));
        console.log(`  ✅ 通过：${passed}`);
        console.log(`  ❌ 失败：${failed}`);
        console.log(`  📝 总计：${passed + failed}`);
        console.log();
        
        if (failed === 0) {
            console.log('  🎉 所有测试通过！');
        } else {
            console.log(`  ⚠️  有 ${failed} 个测试失败`);
        }
        console.log();
    }
}

// 运行测试
runTests().catch(console.error);
