"""
OpenClaw 后端主应用
"""

import os
import json
from pathlib import Path
from aiohttp import web
import aiohttp_cors
import db
from services.auth import AuthService
from api.users import setup_routes as setup_user_routes
from api.roles import setup_routes as setup_role_routes
from api.organization import setup_routes as setup_org_routes


# 静态文件目录
STATIC_DIR = Path(__file__).parent.parent / 'frontend' / 'static'
TEMPLATES_DIR = Path(__file__).parent.parent / 'frontend' / 'templates'


# ============================================================================
# 页面路由
# ============================================================================

async def login_page(request):
    """登录页面"""
    template_path = TEMPLATES_DIR / 'login.html'
    if template_path.exists():
        return web.FileResponse(template_path)
    return web.Response(text="Login page not found", status=404)


async def main_page(request):
    """主页面"""
    # 验证会话
    token = request.cookies.get('session_token')
    if not token:
        return web.HTTPFound('/login')
    
    user = await AuthService.get_current_user(token)
    if not user:
        return web.HTTPFound('/login')
    
    template_path = TEMPLATES_DIR / 'main.html'
    if template_path.exists():
        return web.FileResponse(template_path)
    return web.Response(text="Main page not found", status=404)


async def index(request):
    """首页重定向"""
    token = request.cookies.get('session_token')
    if token:
        user = await AuthService.get_current_user(token)
        if user:
            return web.HTTPFound('/main')
    return web.HTTPFound('/login')


# ============================================================================
# API 路由
# ============================================================================

async def api_login(request):
    """登录 API"""
    try:
        data = await request.json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return web.json_response(
                {'success': False, 'message': '用户名和密码不能为空'},
                status=400
            )
        
        # 获取客户端信息
        ip_address = request.remote
        user_agent = request.headers.get('User-Agent', '')
        
        # 执行登录
        user, session, error = await AuthService.login(
            username, 
            password, 
            ip_address, 
            user_agent
        )
        
        if error:
            return web.json_response(
                {'success': False, 'message': error},
                status=401
            )
        
        # 创建响应
        response = web.json_response({
            'success': True,
            'message': '登录成功',
            'user': user.to_dict()
        })
        
        # 设置会话 cookie
        response.set_cookie(
            'session_token',
            session.token,
            max_age=7 * 24 * 60 * 60,  # 7 天
            httponly=True,
            secure=False,  # 生产环境设为 True
            samesite='Lax'
        )
        
        return response
    
    except json.JSONDecodeError:
        return web.json_response(
            {'success': False, 'message': '无效的请求数据'},
            status=400
        )
    except Exception as e:
        print(f"登录错误：{e}")
        return web.json_response(
            {'success': False, 'message': '服务器错误'},
            status=500
        )


async def api_logout(request):
    """登出 API"""
    try:
        token = request.cookies.get('session_token')
        
        if token:
            await AuthService.logout(token)
        
        response = web.json_response({
            'success': True,
            'message': '登出成功'
        })
        response.del_cookie('session_token')
        
        return response
    
    except Exception as e:
        print(f"登出错误：{e}")
        return web.json_response(
            {'success': False, 'message': '服务器错误'},
            status=500
        )


async def api_current_user(request):
    """获取当前用户信息"""
    try:
        token = request.cookies.get('session_token')
        
        if not token:
            return web.json_response(
                {'success': False, 'message': '未登录'},
                status=401
            )
        
        user = await AuthService.get_current_user(token)
        
        if not user:
            return web.json_response(
                {'success': False, 'message': '会话已过期'},
                status=401
            )
        
        return web.json_response({
            'success': True,
            'user': user
        })
    
    except Exception as e:
        print(f"获取用户信息错误：{e}")
        return web.json_response(
            {'success': False, 'message': '服务器错误'},
            status=500
        )


async def api_dashboard(request):
    """仪表盘数据"""
    try:
        token = request.cookies.get('session_token')
        
        if not token:
            return web.json_response(
                {'success': False, 'message': '未登录'},
                status=401
            )
        
        user = await AuthService.get_current_user(token)
        
        if not user:
            return web.json_response(
                {'success': False, 'message': '会话已过期'},
                status=401
            )
        
        # 返回仪表盘数据
        return web.json_response({
            'success': True,
            'data': {
                'user': user,
                'stats': {
                    'total_users': 0,
                    'active_sessions': 0,
                    'system_status': 'normal'
                }
            }
        })
    
    except Exception as e:
        print(f"获取仪表盘数据错误：{e}")
        return web.json_response(
            {'success': False, 'message': '服务器错误'},
            status=500
        )


# ============================================================================
# 应用工厂
# ============================================================================

async def on_startup(app):
    """应用启动时初始化"""
    await db.init_pool()
    print("🚀 OpenClaw 应用启动")


async def on_shutdown(app):
    """应用关闭时清理"""
    await db.close_pool()
    print("👋 OpenClaw 应用关闭")


def create_app():
    """创建应用"""
    app = web.Application()
    
    # 设置路由
    app.router.add_get('/', index)
    app.router.add_get('/login', login_page)
    app.router.add_get('/main', main_page)
    
    # API 路由
    app.router.add_post('/api/login', api_login)
    app.router.add_post('/api/logout', api_logout)
    app.router.add_get('/api/user', api_current_user)
    app.router.add_get('/api/dashboard', api_dashboard)
    
    # 用户管理 API
    setup_user_routes(app)
    
    # 角色和权限管理 API
    setup_role_routes(app)
    
    # 组织架构管理 API
    setup_org_routes(app)
    
    # 静态文件
    if STATIC_DIR.exists():
        app.router.add_static('/static/', STATIC_DIR, name='static')
    
    # 配置 CORS
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        )
    })
    
    # 为所有路由添加 CORS
    for route in list(app.router.routes()):
        try:
            cors.add(route)
        except ValueError:
            pass
    
    # 生命周期信号
    app.on_startup.append(on_startup)
    app.on_shutdown.append(on_shutdown)
    
    return app


# ============================================================================
# 主入口
# ============================================================================

if __name__ == '__main__':
    app = create_app()
    web.run_app(app, host='0.0.0.0', port=18789)
