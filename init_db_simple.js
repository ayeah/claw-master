#!/usr/bin/env node
/**
 * 简化的数据库初始化脚本
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = {
    host: process.env.DB_HOST || 'postgresql',
    port: process.env.DB_PORT || 5432,
    database: 'claw-master',
    user: process.env.DB_USER || 'user_xKQftk',
    password: process.env.DB_PASSWORD || 'password_yP7FCG',
};

async function initDatabase() {
    console.log('='.repeat(70));
    console.log('  🚀 OpenClaw 数据库初始化');
    console.log('='.repeat(70));
    console.log();
    
    const client = new Client(config);
    
    try {
        console.log('🔌 连接到 claw-master 数据库...');
        await client.connect();
        console.log('✅ 连接成功！');
        console.log();
        
        // 读取 SQL 文件
        const sqlPath = path.join(__dirname, 'database', 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');
        
        console.log('📄 执行 SQL 脚本...');
        console.log(`   文件：${sqlPath}`);
        console.log();
        
        // 执行整个 SQL 文件
        await client.query(sql);
        
        console.log('✅ SQL 脚本执行成功！');
        console.log();
        
        // 验证表
        console.log('📋 验证表创建:');
        console.log('-'.repeat(70));
        
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log(`  找到 ${tables.rows.length} 个表:\n`);
        tables.rows.forEach(row => {
            console.log(`    ✓ ${row.table_name}`);
        });
        console.log();
        
        // 显示默认管理员
        console.log('👤 默认管理员账号:');
        console.log('-'.repeat(70));
        
        const admin = await client.query(`
            SELECT username, email, role, status, created_at 
            FROM users 
            WHERE username = 'admin'
        `);
        
        if (admin.rows.length > 0) {
            const a = admin.rows[0];
            console.log('  ✅ 管理员账号:');
            console.log(`     用户名：${a.username}`);
            console.log(`     邮箱：${a.email}`);
            console.log(`     角色：${a.role}`);
            console.log(`     状态：${a.status}`);
            console.log();
            console.log('  🔐 默认密码：Admin@123');
            console.log('  ⚠️  请首次登录后修改密码！');
        }
        
        console.log();
        console.log('='.repeat(70));
        console.log('  ✅ 数据库初始化完成！');
        console.log('='.repeat(70));
        
        await client.end();
        
    } catch (error) {
        console.log(`❌ 错误：${error.message}`);
        
        if (error.code === '3D000') {
            console.log();
            console.log('数据库不存在，请先创建:');
            console.log('  node init_database.js');
        } else if (error.code === '42P01') {
            console.log();
            console.log('表不存在，SQL 脚本可能有语法问题');
        }
        
        if (client) {
            await client.end();
        }
    }
}

initDatabase();
