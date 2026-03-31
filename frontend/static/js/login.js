/**
 * OpenClaw 登录页面脚本
 */

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.querySelector('.login-btn');
    
    // 检查是否已登录
    checkLoginStatus();
    
    // 表单提交处理
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 清除错误
        hideError();
        
        // 获取表单数据
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        // 验证输入
        if (!username || !password) {
            showError('请输入用户名和密码');
            return;
        }
        
        // 禁用按钮
        setLoading(true);
        
        try {
            // 发送登录请求
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // 登录成功，跳转到主页
                window.location.href = '/main';
            } else {
                // 登录失败
                showError(data.message || '登录失败，请检查用户名和密码');
            }
        } catch (error) {
            console.error('登录错误:', error);
            showError('网络错误，请稍后重试');
        } finally {
            // 恢复按钮状态
            setLoading(false);
        }
    });
    
    // 显示错误消息
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
        
        // 3 秒后自动隐藏
        setTimeout(() => {
            hideError();
        }, 5000);
    }
    
    // 隐藏错误消息
    function hideError() {
        errorMessage.classList.remove('show');
    }
    
    // 设置按钮加载状态
    function setLoading(loading) {
        if (loading) {
            loginBtn.classList.add('loading');
            loginBtn.disabled = true;
        } else {
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    }
    
    // 检查登录状态
    async function checkLoginStatus() {
        try {
            const response = await fetch('/api/user', {
                method: 'GET',
                credentials: 'same-origin'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    // 已登录，跳转到主页
                    window.location.href = '/main';
                }
            }
        } catch (error) {
            // 忽略错误，继续显示登录页面
            console.log('检查登录状态失败:', error);
        }
    }
    
    // 输入框自动聚焦
    usernameInput.focus();
    
    // 回车键提交
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
});
