#!/usr/bin/env node
/**
 * 运行数据库扩展脚本
 * 执行组织架构相关的 SQL 脚本
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 数据库配置
const dbConfig = {
    host: 'postgresql',
    port: 5432,
    user: 'user_xKQftk',
    password: 'password_yP7FCG',
    database: 'claw-master'
};

async function runMigration() {
    console.log('='.repeat(70));
    console.log('  🚀 OpenClaw 数据库扩展 - 组织架构模块');
    console.log('='.repeat(70));
    console.log();
    
    const client = new Client(dbConfig);
    
    try {
        // 连接数据库
        console.log('📡 连接数据库...');
        await client.connect();
        console.log('  ✅ 数据库连接成功\n');
        
        // 读取 SQL 脚本
        const sqlPath = path.join(__dirname, 'database', '02_organization.sql');
        console.log(`📄 读取 SQL 脚本：${sqlPath}`);
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        console.log(`  ✅ 脚本大小：${(sqlContent.length / 1024).toFixed(2)} KB\n`);
        
        // 执行 SQL 脚本
        console.log('⚙️  执行 SQL 脚本...');
        await client.query(sqlContent);
        console.log('  ✅ SQL 脚本执行成功\n');
        
        // 验证表创建
        console.log('📋 验证表创建...');
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('departments', 'user_departments', 'permissions')
            ORDER BY table_name
        `);
        
        console.log(`  ✅ 创建 ${tables.rows.length} 个新表:`);
        tables.rows.forEach(row => {
            console.log(`     - ${row.table_name}`);
        });
        console.log();
        
        // 验证视图创建
        console.log('📋 验证视图创建...');
        const views = await client.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name IN ('department_tree', 'department_stats')
            ORDER BY table_name
        `);
        
        console.log(`  ✅ 创建 ${views.rows.length} 个新视图:`);
        views.rows.forEach(row => {
            console.log(`     - ${row.table_name}`);
        });
        console.log();
        
        // 验证默认部门
        console.log('📋 验证默认部门...');
        const departments = await client.query(`
            SELECT code, name, status 
            FROM departments 
            WHERE deleted_at IS NULL 
            ORDER BY sort_order
        `);
        
        console.log(`  ✅ 初始化 ${departments.rows.length} 个默认部门:`);
        departments.rows.forEach(row => {
            console.log(`     - ${row.code}: ${row.name}`);
        });
        console.log();
        
        // 验证权限
        console.log('📋 验证权限配置...');
        const permissions = await client.query(`
            SELECT COUNT(*) as count 
            FROM permissions
        `);
        
        console.log(`  ✅ 初始化 ${permissions.rows[0].count} 个权限\n`);
        
        // 总结
        console.log('='.repeat(70));
        console.log('  ✅ 数据库扩展完成！');
        console.log('='.repeat(70));
        console.log();
        console.log('新增功能:');
        console.log('  - 部门管理（支持多级部门树）');
        console.log('  - 用户部门关联（支持多部门）');
        console.log('  - 权限元数据管理');
        console.log();
        console.log('API 端点:');
        console.log('  - GET    /api/departments          # 部门列表（支持树形）');
        console.log('  - POST   /api/departments          # 创建部门');
        console.log('  - GET    /api/departments/:id      # 部门详情');
        console.log('  - PUT    /api/departments/:id      # 更新部门');
        console.log('  - DELETE /api/departments/:id      # 删除部门');
        console.log('  - GET    /api/departments/:id/users  # 部门成员');
        console.log('  - GET    /api/users/:id/departments  # 用户的部门');
        console.log('  - POST   /api/departments/:id/users  # 分配用户到部门');
        console.log('  - DELETE /api/departments/:id/users/:uid  # 移除部门成员');
        console.log('  - GET    /api/permissions          # 权限列表');
        console.log();
        
    } catch (error) {
        console.log('\n❌ 执行失败:', error.message);
        console.log(error.stack);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// 运行迁移
runMigration().catch(console.error);
