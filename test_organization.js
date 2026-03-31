#!/usr/bin/env node
/**
 * 组织架构模块测试脚本
 * 测试部门管理、用户部门关联等功能
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
let testDeptId = null;
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
    console.log('  🧪 OpenClaw 组织架构模块测试');
    console.log('='.repeat(70));
    console.log();
    
    try {
        // 连接数据库
        console.log('📡 连接数据库...');
        client = new Client(dbConfig);
        await client.connect();
        console.log('  ✅ 数据库连接成功\n');
        
        // 测试 1: 检查表结构
        console.log('📋 测试 1: 检查表结构');
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('departments', 'user_departments', 'permissions')
        `);
        
        logTest('departments 表存在', tablesResult.rows.some(r => r.table_name === 'departments'));
        logTest('user_departments 表存在', tablesResult.rows.some(r => r.table_name === 'user_departments'));
        logTest('permissions 表存在', tablesResult.rows.some(r => r.table_name === 'permissions'));
        console.log();
        
        // 测试 2: 检查视图
        console.log('📋 测试 2: 检查视图');
        const viewsResult = await client.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name IN ('department_tree', 'department_stats')
        `);
        
        logTest('department_tree 视图存在', viewsResult.rows.some(r => r.table_name === 'department_tree'));
        logTest('department_stats 视图存在', viewsResult.rows.some(r => r.table_name === 'department_stats'));
        console.log();
        
        // 测试 3: 检查默认部门
        console.log('🏢 测试 3: 检查默认部门');
        const deptsResult = await client.query(`
            SELECT code, name, parent_id, status 
            FROM departments 
            WHERE deleted_at IS NULL 
            ORDER BY sort_order
        `);
        
        logTest(`初始化 ${deptsResult.rows.length} 个部门`, deptsResult.rows.length >= 7);
        
        const deptCodes = deptsResult.rows.map(r => r.code);
        logTest('HEAD 总公司存在', deptCodes.includes('HEAD'));
        logTest('TECH 技术部存在', deptCodes.includes('TECH'));
        logTest('PROD 产品部存在', deptCodes.includes('PROD'));
        
        // 检查层级关系
        const techDept = deptsResult.rows.find(r => r.code === 'TECH');
        logTest('技术部有父部门', techDept && techDept.parent_id !== null);
        console.log();
        
        // 测试 4: 创建测试部门
        console.log('➕ 测试 4: 创建测试部门');
        const timestamp = Date.now();
        const testDeptCode = `TEST_${timestamp}`;
        
        try {
            const createDeptResult = await client.query(`
                INSERT INTO departments (name, code, description, sort_order, status)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, name, code
            `, [`测试部门${timestamp}`, testDeptCode, '测试用途', 100, 'active']);
            
            const newDept = createDeptResult.rows[0];
            logTest(`创建部门 ${newDept.name}`, true);
            logTest('获取部门 ID', true, newDept.id);
            testDeptId = newDept.id;
        } catch (error) {
            logTest('创建测试部门', false, error.message);
        }
        console.log();
        
        // 测试 5: 创建子部门
        console.log('📂 测试 5: 创建子部门');
        if (testDeptId) {
            try {
                const subDeptResult = await client.query(`
                    INSERT INTO departments (name, code, parent_id, description)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id, name, parent_id
                `, [`测试子部门${timestamp}`, `SUB_${timestamp}`, testDeptId, '测试子部门']);
                
                const subDept = subDeptResult.rows[0];
                logTest(`创建子部门 ${subDept.name}`, true);
                logTest('子部门有父部门', subDept.parent_id === testDeptId);
            } catch (error) {
                logTest('创建子部门', false, error.message);
            }
        } else {
            logTest('跳过子部门测试', false, '无父部门 ID');
        }
        console.log();
        
        // 测试 6: 查询部门树
        console.log('🌳 测试 6: 查询部门树视图');
        try {
            const treeResult = await client.query(`
                SELECT id, name, code, level, full_name 
                FROM department_tree 
                ORDER BY path
                LIMIT 10
            `);
            
            logTest(`查询到 ${treeResult.rows.length} 个部门`, treeResult.rows.length > 0);
            
            const headDept = treeResult.rows.find(r => r.code === 'HEAD');
            if (headDept) {
                logTest('HEAD 层级为 0', headDept.level === 0);
                logTest('HEAD 全名为总公司', headDept.full_name === '总公司');
            }
            
            const techDept = treeResult.rows.find(r => r.code === 'TECH');
            if (techDept) {
                logTest('TECH 层级为 1', techDept.level === 1);
                logTest('TECH 全名包含层级', techDept.full_name.includes(' > '));
            }
        } catch (error) {
            logTest('部门树查询', false, error.message);
        }
        console.log();
        
        // 测试 7: 查询部门统计
        console.log('📊 测试 7: 查询部门统计视图');
        try {
            const statsResult = await client.query(`
                SELECT id, name, user_count, primary_user_count 
                FROM department_stats 
                ORDER BY user_count DESC
                LIMIT 5
            `);
            
            logTest(`查询到 ${statsResult.rows.length} 个部门统计`, statsResult.rows.length > 0);
            
            statsResult.rows.forEach(row => {
                console.log(`   - ${row.name}: ${row.user_count} 人`);
            });
            logTest('统计视图正常', true);
        } catch (error) {
            logTest('部门统计查询', false, error.message);
        }
        console.log();
        
        // 测试 8: 更新部门
        console.log('✏️  测试 8: 更新部门');
        if (testDeptId) {
            try {
                await client.query(`
                    UPDATE departments 
                    SET description = $2, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [testDeptId, '更新后的描述']);
                
                const verifyResult = await client.query(`
                    SELECT description FROM departments WHERE id = $1
                `, [testDeptId]);
                
                const updated = verifyResult.rows[0];
                logTest('更新部门成功', updated.description === '更新后的描述');
            } catch (error) {
                logTest('更新部门', false, error.message);
            }
        } else {
            logTest('跳过更新测试', false, '无部门 ID');
        }
        console.log();
        
        // 测试 9: 检查权限表
        console.log('🔑 测试 9: 检查权限表');
        try {
            const permsResult = await client.query(`
                SELECT code, name, category 
                FROM permissions 
                ORDER BY category, code
            `);
            
            logTest(`初始化 ${permsResult.rows.length} 个权限`, permsResult.rows.length >= 16);
            
            // 按分类统计
            const categories = {};
            permsResult.rows.forEach(row => {
                if (!categories[row.category]) {
                    categories[row.category] = 0;
                }
                categories[row.category]++;
            });
            
            Object.entries(categories).forEach(([cat, count]) => {
                console.log(`   - ${cat}: ${count} 个权限`);
            });
            
            const permCodes = permsResult.rows.map(r => r.code);
            logTest('包含 user:* 权限', permCodes.some(c => c.startsWith('user:')));
            logTest('包含 dept:* 权限', permCodes.some(c => c.startsWith('dept:')));
            logTest('包含 role:* 权限', permCodes.some(c => c.startsWith('role:')));
        } catch (error) {
            logTest('权限表检查', false, error.message);
        }
        console.log();
        
        // 测试 10: 用户部门关联
        console.log('👥 测试 10: 用户部门关联');
        try {
            // 获取 admin 用户 ID
            const adminResult = await client.query(`
                SELECT id FROM users WHERE username = 'admin' AND deleted_at IS NULL
            `);
            
            if (adminResult.rows.length > 0) {
                testUserId = adminResult.rows[0].id;
                logTest('获取 admin 用户 ID', true, testUserId);
                
                // 将 admin 分配到技术部
                const techDept = deptsResult.rows.find(r => r.code === 'TECH');
                if (techDept && techDept.id && testUserId) {
                    await client.query(`
                        INSERT INTO user_departments (user_id, department_id, is_primary)
                        VALUES ($1, $2, true)
                        ON CONFLICT (user_id, department_id) DO UPDATE
                        SET is_primary = true, joined_at = CURRENT_TIMESTAMP
                    `, [testUserId, techDept.id]);
                    
                    logTest('分配用户到部门', true);
                    
                    // 验证分配
                    const userDeptsResult = await client.query(`
                        SELECT ud.*, d.name as dept_name
                        FROM user_departments ud
                        JOIN departments d ON ud.department_id = d.id
                        WHERE ud.user_id = $1
                    `, [testUserId]);
                    
                    logTest(`用户有 ${userDeptsResult.rows.length} 个部门`, userDeptsResult.rows.length > 0);
                    
                    const primaryDept = userDeptsResult.rows.find(r => r.is_primary);
                    if (primaryDept) {
                        logTest('主部门设置正确', primaryDept.dept_name === '技术部');
                    }
                }
            } else {
                logTest('获取 admin 用户', false, '未找到 admin 用户');
            }
        } catch (error) {
            logTest('用户部门关联', false, error.message);
        }
        console.log();
        
        // 测试 11: 查询部门成员
        console.log('👥 测试 11: 查询部门成员');
        try {
            const techDept = deptsResult.rows.find(r => r.code === 'TECH');
            if (techDept) {
                const membersResult = await client.query(`
                    SELECT ud.*, u.username, u.display_name
                    FROM user_departments ud
                    JOIN users u ON ud.user_id = u.id
                    WHERE ud.department_id = $1 AND u.deleted_at IS NULL
                `, [techDept.id]);
                
                logTest(`技术部有 ${membersResult.rows.length} 个成员`, membersResult.rows.length > 0);
            }
        } catch (error) {
            logTest('部门成员查询', false, error.message);
        }
        console.log();
        
        // 测试 12: 删除测试部门
        console.log('🗑️  测试 12: 删除测试部门');
        if (testDeptId) {
            try {
                // 先删除子部门
                await client.query(`
                    UPDATE departments 
                    SET deleted_at = CURRENT_TIMESTAMP 
                    WHERE parent_id = $1
                `, [testDeptId]);
                
                // 删除测试部门
                await client.query(`
                    UPDATE departments 
                    SET deleted_at = CURRENT_TIMESTAMP 
                    WHERE id = $1
                `, [testDeptId]);
                
                logTest('删除测试部门', true);
                
                // 验证删除
                const verifyResult = await client.query(`
                    SELECT id FROM departments WHERE id = $1 AND deleted_at IS NULL
                `, [testDeptId]);
                
                logTest('删除后查询不到', verifyResult.rows.length === 0);
            } catch (error) {
                logTest('删除测试部门', false, error.message);
            }
        } else {
            logTest('跳过删除测试', false, '无部门 ID');
        }
        console.log();
        
    } catch (error) {
        console.log(`\n❌ 测试中断：${error.message}\n`);
        console.log(error.stack);
    } finally {
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
