#!/usr/bin/env node
/**
 * API 测试脚本
 * 测试用户管理模块的所有 API
 */

const http = require('http');

// 配置
const BASE_URL = 'http://localhost:18789';
let SESSION_TOKEN = null;

// HTTP 请求封装
function request(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: result
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: body
                    });
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// 测试步骤
async function runTests() {
    console.log('='.repeat(70));
    console.log('  🧪 OpenClaw 用户管理模块 API 测试');
    console.log('='.repeat(70));
    console.log();
    
    let passed = 0;
    let failed = 0;
    
    try {
        // 测试 1: 登录
        console.log('📝 测试 1: 用户登录...');
        const loginRes = await request('POST', '/api/login', {
            username: 'admin',
            password: 'Admin@123'
        });
        
        if (loginRes.status === 200 && loginRes.data.success) {
            console.log('  ✅ 登录成功');
            SESSION_TOKEN = loginRes.headers['set-cookie']
                ?.find(c => c.startsWith('session_token='))
                ?.split(';')[0]
                ?.split('=')[1];
            passed++;
        } else {
            console.log('  ❌ 登录失败:', loginRes.data);
            failed++;
            // 如果登录失败，后续测试无法进行
            throw new Error('登录失败，无法继续测试');
        }
        console.log();
        
        // 测试 2: 获取当前用户信息
        console.log('👤 测试 2: 获取当前用户信息...');
        const userRes = await request('GET', '/api/user', null, {
            'Cookie': `session_token=${SESSION_TOKEN}`
        });
        
        if (userRes.status === 200 && userRes.data.success) {
            console.log('  ✅ 获取用户信息成功');
            console.log(`     用户名：${userRes.data.user.username}`);
            console.log(`     角色：${userRes.data.user.role}`);
            passed++;
        } else {
            console.log('  ❌ 获取用户信息失败:', userRes.data);
            failed++;
        }
        console.log();
        
        // 测试 3: 创建用户
        console.log('➕ 测试 3: 创建新用户...');
        const newUser = {
            username: 'testuser' + Date.now(),
            email: `test${Date.now()}@example.com`,
            password: 'Test@12345',
            display_name: '测试用户'
        };
        
        const createRes = await request('POST', '/api/users', newUser, {
            'Cookie': `session_token=${SESSION_TOKEN}`
        });
        
        if (createRes.status === 201 && createRes.data.success) {
            console.log('  ✅ 创建用户成功');
            console.log(`     用户 ID: ${createRes.data.data.user.id}`);
            console.log(`     用户名：${createRes.data.data.user.username}`);
            passed++;
            
            // 保存用户 ID 用于后续测试
            const testUserId = createRes.data.data.user.id;
            
            // 测试 4: 获取用户列表
            console.log();
            console.log('📋 测试 4: 获取用户列表...');
            const listRes = await request('GET', '/api/users?page=1&page_size=10', null, {
                'Cookie': `session_token=${SESSION_TOKEN}`
            });
            
            if (listRes.status === 200 && listRes.data.success) {
                console.log('  ✅ 获取用户列表成功');
                console.log(`     总数：${listRes.data.data.pagination.total}`);
                console.log(`     当前页：${listRes.data.data.pagination.page}`);
                passed++;
            } else {
                console.log('  ❌ 获取用户列表失败:', listRes.data);
                failed++;
            }
            
            // 测试 5: 获取单个用户详情
            console.log();
            console.log('🔍 测试 5: 获取用户详情...');
            const detailRes = await request('GET', `/api/users/${testUserId}`, null, {
                'Cookie': `session_token=${SESSION_TOKEN}`
            });
            
            if (detailRes.status === 200 && detailRes.data.success) {
                console.log('  ✅ 获取用户详情成功');
                passed++;
            } else {
                console.log('  ❌ 获取用户详情失败:', detailRes.data);
                failed++;
            }
            
            // 测试 6: 更新用户
            console.log();
            console.log('✏️  测试 6: 更新用户信息...');
            const updateRes = await request('PUT', `/api/users/${testUserId}`, {
                display_name: '更新后的测试用户'
            }, {
                'Cookie': `session_token=${SESSION_TOKEN}`
            });
            
            if (updateRes.status === 200 && updateRes.data.success) {
                console.log('  ✅ 更新用户成功');
                passed++;
            } else {
                console.log('  ❌ 更新用户失败:', updateRes.data);
                failed++;
            }
            
            // 测试 7: 修改密码
            console.log();
            console.log('🔐 测试 7: 修改密码...');
            const passwordRes = await request('POST', `/api/users/${testUserId}/password`, {
                old_password: 'Test@12345',
                new_password: 'NewTest@12345'
            }, {
                'Cookie': `session_token=${SESSION_TOKEN}`
            });
            
            if (passwordRes.status === 200 && passwordRes.data.success) {
                console.log('  ✅ 修改密码成功');
                passed++;
            } else {
                console.log('  ❌ 修改密码失败:', passwordRes.data);
                failed++;
            }
            
            // 测试 8: 删除用户
            console.log();
            console.log('🗑️  测试 8: 删除用户...');
            const deleteRes = await request('DELETE', `/api/users/${testUserId}`, null, {
                'Cookie': `session_token=${SESSION_TOKEN}`
            });
            
            if (deleteRes.status === 200 && deleteRes.data.success) {
                console.log('  ✅ 删除用户成功');
                passed++;
            } else {
                console.log('  ❌ 删除用户失败:', deleteRes.data);
                failed++;
            }
            
        } else {
            console.log('  ❌ 创建用户失败:', createRes.data);
            failed++;
        }
        console.log();
        
        // 测试 9: 获取权限列表
        console.log('🔑 测试 9: 获取权限列表...');
        const permRes = await request('GET', '/api/permissions');
        
        if (permRes.status === 200 && permRes.data.success) {
            console.log('  ✅ 获取权限列表成功');
            const categories = Object.keys(permRes.data.data.permissions);
            console.log(`     权限分类：${categories.join(', ')}`);
            passed++;
        } else {
            console.log('  ❌ 获取权限列表失败:', permRes.data);
            failed++;
        }
        console.log();
        
        // 测试 10: 获取角色列表
        console.log('👥 测试 10: 获取角色列表...');
        const rolesRes = await request('GET', '/api/roles');
        
        if (rolesRes.status === 200 && rolesRes.data.success) {
            console.log('  ✅ 获取角色列表成功');
            console.log(`     角色数：${rolesRes.data.data.roles.length}`);
            rolesRes.data.data.roles.forEach(role => {
                console.log(`       - ${role.name}: ${role.description}`);
            });
            passed++;
        } else {
            console.log('  ❌ 获取角色列表失败:', rolesRes.data);
            failed++;
        }
        console.log();
        
        // 测试 11: 登出
        console.log('👋 测试 11: 用户登出...');
        const logoutRes = await request('POST', '/api/logout', null, {
            'Cookie': `session_token=${SESSION_TOKEN}`
        });
        
        if (logoutRes.status === 200 && logoutRes.data.success) {
            console.log('  ✅ 登出成功');
            passed++;
        } else {
            console.log('  ❌ 登出失败:', logoutRes.data);
            failed++;
        }
        console.log();
        
    } catch (error) {
        console.log(`\n❌ 测试中断：${error.message}\n`);
    }
    
    // 测试总结
    console.log('='.repeat(70));
    console.log('  📊 测试总结');
    console.log('='.repeat(70));
    console.log(`  通过：${passed}`);
    console.log(`  失败：${failed}`);
    console.log(`  总计：${passed + failed}`);
    console.log();
    
    if (failed === 0) {
        console.log('  ✅ 所有测试通过！');
    } else {
        console.log(`  ⚠️  有 ${failed} 个测试失败`);
    }
    console.log();
}

// 运行测试
runTests().catch(console.error);
