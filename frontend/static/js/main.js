/**
 * OpenClaw 主页面脚本
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化
    loadUserInfo();
    loadDashboardData();
    setupEventListeners();
});

// 加载用户信息
async function loadUserInfo() {
    try {
        const response = await fetch('/api/user', {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            // 未登录，跳转到登录页
            window.location.href = '/login';
            return;
        }
        
        const data = await response.json();
        
        if (data.success && data.user) {
            const user = data.user;
            
            // 更新用户信息显示
            document.getElementById('userName').textContent = user.display_name || user.username;
            document.getElementById('userRole').textContent = getRoleName(user.role);
            
            // 更新最后登录时间
            if (user.last_login_at) {
                const lastLogin = new Date(user.last_login_at);
                document.getElementById('lastLogin').textContent = formatDateTime(lastLogin);
            }
            
            // 更新欢迎消息
            updateWelcomeMessage(user);
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('加载用户信息失败:', error);
        window.location.href = '/login';
    }
}

// 加载仪表盘数据
async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard', {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.data) {
                const stats = data.data.stats;
                
                // 更新统计数据
                document.getElementById('totalUsers').textContent = formatNumber(stats.total_users || 0);
                document.getElementById('activeSessions').textContent = formatNumber(stats.active_sessions || 0);
                document.getElementById('systemStatus').textContent = getSystemStatusText(stats.system_status);
            }
        }
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 退出登录按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 菜单切换按钮（移动端）
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
        
        // 点击内容区关闭侧边栏
        document.querySelector('.main-content').addEventListener('click', function() {
            if (window.innerWidth <= 1024 && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    }
}

// 处理退出登录
async function handleLogout() {
    if (!confirm('确定要退出登录吗？')) {
        return;
    }
    
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            alert('退出登录失败，请重试');
        }
    } catch (error) {
        console.error('退出登录失败:', error);
        alert('网络错误，请稍后重试');
    }
}

// 更新欢迎消息
function updateWelcomeMessage(user) {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const hour = new Date().getHours();
    
    let greeting = '你好';
    if (hour >= 5 && hour < 12) {
        greeting = '早上好';
    } else if (hour >= 12 && hour < 14) {
        greeting = '中午好';
    } else if (hour >= 14 && hour < 18) {
        greeting = '下午好';
    } else if (hour >= 18 && hour < 22) {
        greeting = '晚上好';
    } else {
        greeting = '夜深了';
    }
    
    const displayName = user.display_name || user.username;
    welcomeMessage.textContent = `${greeting}，${displayName}！这是 OpenClaw 企业级管理平台。`;
}

// 获取角色名称
function getRoleName(role) {
    const roles = {
        'admin': '系统管理员',
        'user': '普通用户',
        'guest': '访客'
    };
    return roles[role] || role;
}

// 获取系统状态文本
function getSystemStatusText(status) {
    const statuses = {
        'normal': '正常',
        'warning': '警告',
        'error': '异常'
    };
    return statuses[status] || status;
}

// 格式化数字
function formatNumber(num) {
    return num.toLocaleString('zh-CN');
}

// 格式化日期时间
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}
