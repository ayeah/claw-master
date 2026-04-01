#!/usr/bin/env node
/**
 * 数据库初始化脚本
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 数据库配置（先连接到 postgres 数据库）
const config = {
    host: process.env.DB_HOST || 'postgresql',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',  // 先连接到默认数据库
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
        // 1. 连接到 postgres 数据库
        console.log('🔌 连接到数据库服务器...');
        await client.connect();
        console.log('✅ 连接成功！');
        console.log();
        
        // 2. 创建 claw-master 数据库
        console.log('📦 创建数据库 claw-master...');
        try {
            await client.query(`
                SELECT pg_terminate_backend(pid) 
                FROM pg_stat_activity 
                WHERE datname = 'claw-master' AND pid <> pg_backend_pid()
            `);
            
            await client.query('DROP DATABASE IF EXISTS "claw-master"');
            await client.query('CREATE DATABASE "claw-master"');
            console.log('✅ 数据库创建成功！');
        } catch (error) {
            console.log(`⚠️  数据库创建可能已存在：${error.message}`);
        }
        console.log();
        
        // 3. 读取初始化 SQL 脚本
        console.log('📄 读取初始化脚本...');
        const initSqlPath = path.join(__dirname, 'database', 'init.sql');
        
        if (!fs.existsSync(initSqlPath)) {
            console.log(`❌ 初始化脚本不存在：${initSqlPath}`);
            return;
        }
        
        let initSql = fs.readFileSync(initSqlPath, 'utf-8');
        console.log(`✅ 脚本读取成功：${initSqlPath}`);
        console.log(`   脚本大小：${(initSql.length / 1024).toFixed(2)} KB`);
        console.log();
        
        // 4. 连接到 claw-master 数据库
        await client.end();
        
        const masterClient = new Client({
            ...config,
            database: 'claw-master'
        });
        
        console.log('🔌 连接到 claw-master 数据库...');
        await masterClient.connect();
        console.log('✅ 连接成功！');
        console.log();
        
        // 5. 执行初始化脚本
        console.log('⚙️  执行初始化脚本...');
        console.log();
        
        // 分割 SQL 语句（按分号分割，但要注意注释和字符串）
        const statements = initSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => {
                // 过滤掉空语句、注释和元命令
                if (!stmt) return false;
                if (stmt.startsWith('--')) return false;
                if (stmt.startsWith('\\')) return false;
                return true;
            });
        
        console.log(`📊 共 ${statements.length} 条 SQL 语句`);
        console.log();
        
        let successCount = 0;
        let skipCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            const num = i + 1;
            
            try {
                // 跳过元命令
                if (statement.includes('\\c') || statement.includes('SELECT') && statement.includes('CREATE DATABASE')) {
                    console.log(`  [${num}/${statements.length}] ⏭️  跳过元命令`);
                    skipCount++;
                    continue;
                }
                
                await masterClient.query(statement);
                console.log(`  [${num}/${statements.length}] ✅ 执行成功`);
                successCount++;
                
            } catch (error) {
                // 忽略已存在的错误
                if (error.code === '42P07' || error.code === '42601') {
                    console.log(`  [${num}/${statements.length}] ⏭️  已存在，跳过`);
                    skipCount++;
                } else {
                    console.log(`  [${num}/${statements.length}] ⚠️  ${error.message.substring(0, 60)}`);
                }
            }
        }
        
        console.log();
        console.log('-'.repeat(70));
        console.log(`执行完成：成功 ${successCount} 条，跳过 ${skipCount} 条`);
        console.log();
        
        // 6. 验证表创建
        console.log('📋 验证表创建:');
        console.log('-'.repeat(70));
        
        const tablesResult = await masterClient.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log(`  找到 ${tablesResult.rows.length} 个表:`);
        tablesResult.rows.forEach(row => {
            console.log(`    • ${row.table_name}`);
        });
        console.log();
        
        // 7. 显示默认管理员账号
        console.log('👤 默认管理员账号:');
        console.log('-'.repeat(70));
        
        try {
            const adminResult = await masterClient.query(`
                SELECT username, email, role, status 
                FROM users 
                WHERE username = 'admin'
            `);
            
            if (adminResult.rows.length > 0) {
                const admin = adminResult.rows[0];
                console.log('  ✅ 管理员账号已创建:');
                console.log(`     用户名：${admin.username}`);
                console.log(`     邮箱：${admin.email}`);
                console.log(`     角色：${admin.role}`);
                console.log(`     状态：${admin.status}`);
                console.log();
                console.log('  🔐 默认密码：Admin@123');
                console.log('  ⚠️  请在首次登录后修改密码！');
            } else {
                console.log('  ⚠️  管理员账号未创建');
            }
        } catch (e) {
            console.log('  ⚠️  无法查询管理员账号');
        }
        
        console.log();
        console.log('='.repeat(70));
        console.log('  ✅ 数据库初始化完成！');
        console.log('='.repeat(70));
        console.log();
        
        await masterClient.end();
        
    } catch (error) {
        console.log(`❌ 错误：${error.message}`);
        console.log();
        console.log('可能原因:');
        console.log('  1. 数据库服务器未启动');
        console.log('  2. 数据库用户名或密码错误');
        console.log('  3. 网络连接问题');
        
        if (client) {
            await client.end();
        }
    }
}

// 执行初始化
initDatabase().catch(console.error);
