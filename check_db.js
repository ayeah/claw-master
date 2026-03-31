#!/usr/bin/env node
/**
 * 数据库连接检查脚本
 */

const { Client } = require('pg');

// 数据库配置
const config = {
    host: process.env.DB_HOST || 'postgresql',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'claw-master',
    user: process.env.DB_USER || 'user_xKQftk',
    password: process.env.DB_PASSWORD || 'password_yP7FCG',
};

async function checkDatabase() {
    console.log('='.repeat(70));
    console.log('  🔍 OpenClaw 数据库连接检查');
    console.log('='.repeat(70));
    console.log();
    
    console.log('📋 数据库配置:');
    console.log(`  主机：${config.host}:${config.port}`);
    console.log(`  用户：${config.user}`);
    console.log(`  数据库：${config.database}`);
    console.log();
    
    const client = new Client(config);
    
    try {
        // 1. 连接数据库
        console.log('🔌 正在连接数据库...');
        await client.connect();
        console.log('✅ 数据库连接成功！');
        console.log();
        
        // 2. 获取数据库信息
        console.log('📊 数据库信息:');
        
        const versionResult = await client.query('SELECT version()');
        const version = versionResult.rows[0].version;
        console.log(`  PostgreSQL 版本：${version.substring(0, 60)}...`);
        
        const dbResult = await client.query('SELECT current_database()');
        console.log(`  当前数据库：${dbResult.rows[0].current_database}`);
        
        const userResult = await client.query('SELECT current_user');
        console.log(`  当前用户：${userResult.rows[0].current_user}`);
        console.log();
        
        // 3. 列出所有表
        console.log('📋 数据库表列表:');
        console.log('-'.repeat(70));
        
        const tablesResult = await client.query(`
            SELECT 
                table_schema,
                table_name,
                table_type
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY table_schema, table_name
        `);
        
        if (tablesResult.rows.length === 0) {
            console.log('  ⚠️  未找到用户表');
            console.log();
            console.log('  提示：请运行数据库初始化脚本创建表结构');
            console.log('  脚本位置：database/init.sql');
        } else {
            console.log(`  找到 ${tablesResult.rows.length} 个表:\n`);
            
            for (const table of tablesResult.rows) {
                const schema = table.table_schema;
                const name = table.table_name;
                const type = table.table_type;
                
                // 获取表注释
                try {
                    const commentResult = await client.query(`
                        SELECT obj_description(
                            (quote_ident($1) || '.' || quote_ident($2))::regclass::oid
                        ) as comment
                    `, [schema, name]);
                    
                    const comment = commentResult.rows[0].comment;
                    const commentText = comment ? ` - ${comment}` : '';
                    console.log(`  • ${schema}.${name} (${type})${commentText}`);
                } catch (e) {
                    console.log(`  • ${schema}.${name} (${type})`);
                }
            }
        }
        
        console.log();
        console.log('-'.repeat(70));
        
        // 4. 显示表详情
        console.log();
        console.log('📦 表详情:');
        console.log('-'.repeat(70));
        
        for (const table of tablesResult.rows) {
            const schema = table.table_schema;
            const name = table.table_name;
            
            try {
                // 获取行数
                const countResult = await client.query(
                    `SELECT COUNT(*) as count FROM ${schema}.${name}`
                );
                const rowCount = countResult.rows[0].count;
                
                // 获取列信息
                const columnsResult = await client.query(`
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_schema = $1 AND table_name = $2
                    ORDER BY ordinal_position
                `, [schema, name]);
                
                console.log(`\n  📊 ${schema}.${name} (${rowCount} 行)`);
                console.log(`     列数：${columnsResult.rows.length}`);
                
                // 显示前 5 列
                columnsResult.rows.slice(0, 5).forEach(col => {
                    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                    const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                    console.log(`       - ${col.column_name}: ${col.data_type} (${nullable}${defaultVal})`);
                });
                
                if (columnsResult.rows.length > 5) {
                    console.log(`       ... 还有 ${columnsResult.rows.length - 5} 列`);
                }
                
            } catch (e) {
                console.log(`\n  ⚠️  ${schema}.${name}: 无法查询详情`);
            }
        }
        
        console.log();
        console.log('-'.repeat(70));
        
        // 5. 检查默认管理员用户
        console.log();
        console.log('👤 检查默认管理员用户:');
        try {
            const adminResult = await client.query(`
                SELECT id, username, email, role, status, created_at 
                FROM users 
                WHERE username = 'admin'
            `);
            
            if (adminResult.rows.length > 0) {
                const admin = adminResult.rows[0];
                console.log('  ✅ 默认管理员账号存在:');
                console.log(`     用户名：${admin.username}`);
                console.log(`     邮箱：${admin.email}`);
                console.log(`     角色：${admin.role}`);
                console.log(`     状态：${admin.status}`);
                console.log(`     创建时间：${admin.created_at}`);
            } else {
                console.log('  ⚠️  默认管理员账号不存在');
            }
        } catch (e) {
            console.log('  ⚠️  users 表不存在或无法查询');
        }
        
        console.log();
        console.log('='.repeat(70));
        console.log('  ✅ 数据库检查完成');
        console.log('='.repeat(70));
        
    } catch (error) {
        console.log(`❌ 错误：${error.message}`);
        console.log();
        
        if (error.code === 'ECONNREFUSED') {
            console.log('可能原因:');
            console.log('  1. 数据库服务未启动');
            console.log('  2. 数据库主机地址错误');
            console.log('  3. 防火墙阻止连接');
        } else if (error.code === '28P01') {
            console.log('可能原因:');
            console.log('  密码错误，请检查数据库密码配置');
        } else if (error.code === '3D000') {
            console.log('可能原因:');
            console.log('  数据库不存在，请先创建数据库或运行初始化脚本');
        }
        
        console.log();
        console.log('提示：');
        console.log('  运行以下命令初始化数据库:');
        console.log('  psql -h postgresql -U user_xKQftk -d postgres -f database/init.sql');
    } finally {
        await client.end();
    }
}

// 执行检查
checkDatabase().catch(console.error);
