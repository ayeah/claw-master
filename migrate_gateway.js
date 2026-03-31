#!/usr/bin/env node
/**
 * API Gateway 数据库迁移脚本
 * 执行 03_api_gateway.sql 到数据库
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 数据库配置
const config = {
    host: 'postgresql',
    port: '5432',
    user: 'user_xKQftk',
    password: 'password_yP7FCG',
    database: 'claw-master'
};

async function migrate() {
    const client = new Client(config);
    
    try {
        console.log('📡 连接数据库...');
        await client.connect();
        console.log('✅ 数据库连接成功');
        
        // 读取 SQL 文件
        const sqlPath = path.join(__dirname, 'database/03_api_gateway.sql');
        console.log(`📖 读取 SQL 文件：${sqlPath}`);
        const sql = fs.readFileSync(sqlPath, 'utf-8');
        console.log(`   文件大小：${(sql.length / 1024).toFixed(2)} KB`);
        
        // 执行 SQL
        console.log('\n🚀 执行数据库迁移...');
        console.log('   这将创建 13 个表、2 个视图和多个索引\n');
        
        await client.query(sql);
        
        console.log('\n✅ 数据库迁移完成！');
        console.log('\n📊 创建的对象:');
        console.log('   表 (13 个):');
        console.log('     - providers (服务商)');
        console.log('     - api_keys (API Key)');
        console.log('     - billing_configs (计费配置)');
        console.log('     - user_balances (用户余额)');
        console.log('     - rate_limit_configs (限流配置)');
        console.log('     - circuit_breaker_configs (熔断配置)');
        console.log('     - load_balance_configs (负载均衡配置)');
        console.log('     - request_logs (请求日志)');
        console.log('     - consumption_records (消费记录)');
        console.log('     - recharge_records (充值记录)');
        console.log('     - provider_health_logs (健康检查日志)');
        console.log('     - sticky_sessions (会话粘性)');
        console.log('     - system_metrics (系统指标)');
        console.log('   视图 (2 个):');
        console.log('     - api_key_stats (API Key 统计)');
        console.log('     - provider_stats (服务商统计)');
        console.log('\n📦 初始化数据:');
        console.log('     - 计费配置：7 条');
        console.log('     - 负载均衡配置：3 条');
        console.log('     - 限流配置：3 条');
        
    } catch (error) {
        console.error('\n❌ 迁移失败:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// 运行迁移
migrate();
