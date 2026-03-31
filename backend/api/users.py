"""
用户管理 API
"""

import json
from aiohttp import web
from services.user_service import UserService, UserValidationError
from services.permission import require_permission, require_role, require_login


async def api_get_users(request):
    """
    获取用户列表（分页）
    
    Query Parameters:
        page: 页码（默认 1）
        page_size: 每页数量（默认 20）
        status: 状态筛选（active/inactive/banned）
        role: 角色筛选（admin/user/guest）
        search: 搜索关键词
    """
    try:
        page = int(request.query.get('page', 1))
        page_size = int(request.query.get('page_size', 20))
        status = request.query.get('status')
        role = request.query.get('role')
        search = request.query.get('search')
        
        # 限制 page_size 范围
        page_size = min(max(page_size, 1), 100)
        
        result = await UserService.get_users(
            page=page,
            page_size=page_size,
            status=status,
            role=role,
            search=search
        )
        
        # 转换用户对象为字典
        users_data = [user.to_dict() for user in result['users']]
        
        return web.json_response({
            'success': True,
            'data': {
                'users': users_data,
                'pagination': {
                    'page': result['page'],
                    'page_size': result['page_size'],
                    'total': result['total'],
                    'total_pages': result['total_pages']
                }
            }
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


async def api_get_user(request):
    """获取用户详情"""
    try:
        user_id = request.match_info['id']
        
        user = await UserService.get_user_by_id(user_id)
        
        if not user:
            return web.json_response(
                {'success': False, 'message': '用户不存在'},
                status=404
            )
        
        return web.json_response({
            'success': True,
            'data': {
                'user': user.to_dict()
            }
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_permission('user:create')
async def api_create_user(request):
    """
    创建用户
    
    Request Body:
        username: 用户名
        email: 邮箱
        password: 密码
        display_name: 显示名称（可选）
        role: 角色（可选，默认 user）
    """
    try:
        data = await request.json()
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        display_name = data.get('display_name')
        role = data.get('role', 'user')
        
        # 创建用户
        user = await UserService.create_user(
            username=username,
            email=email,
            password=password,
            display_name=display_name,
            role=role,
            created_by=request.get('user_id')
        )
        
        return web.json_response({
            'success': True,
            'message': '用户创建成功',
            'data': {
                'user': user.to_dict()
            }
        }, status=201)
    
    except UserValidationError as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=400
        )
    except json.JSONDecodeError:
        return web.json_response(
            {'success': False, 'message': '无效的 JSON 数据'},
            status=400
        )
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_permission('user:update')
async def api_update_user(request):
    """
    更新用户信息
    
    Path Parameters:
        id: 用户 ID
    
    Request Body:
        display_name: 显示名称（可选）
        email: 邮箱（可选）
        role: 角色（可选）
        status: 状态（可选）
        avatar_url: 头像 URL（可选）
    """
    try:
        user_id = request.match_info['id']
        data = await request.json()
        
        # 过滤不允许更新的字段
        allowed_fields = ['display_name', 'email', 'role', 'status', 'avatar_url']
        updates = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not updates:
            return web.json_response(
                {'success': False, 'message': '没有可更新的字段'},
                status=400
            )
        
        user = await UserService.update_user(
            user_id=user_id,
            updates=updates,
            updated_by=request.get('user_id')
        )
        
        if not user:
            return web.json_response(
                {'success': False, 'message': '用户不存在'},
                status=404
            )
        
        return web.json_response({
            'success': True,
            'message': '用户信息已更新',
            'data': {
                'user': user.to_dict()
            }
        })
    
    except UserValidationError as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=400
        )
    except json.JSONDecodeError:
        return web.json_response(
            {'success': False, 'message': '无效的 JSON 数据'},
            status=400
        )
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_permission('user:update')
async def api_update_password(request):
    """
    修改密码
    
    Path Parameters:
        id: 用户 ID
    
    Request Body:
        old_password: 原密码
        new_password: 新密码
    """
    try:
        user_id = request.match_info['id']
        data = await request.json()
        
        old_password = data.get('old_password', '')
        new_password = data.get('new_password', '')
        
        if not old_password or not new_password:
            return web.json_response(
                {'success': False, 'message': '密码不能为空'},
                status=400
            )
        
        success = await UserService.update_password(
            user_id=user_id,
            old_password=old_password,
            new_password=new_password
        )
        
        return web.json_response({
            'success': True,
            'message': '密码已修改'
        })
    
    except UserValidationError as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=400
        )
    except json.JSONDecodeError:
        return web.json_response(
            {'success': False, 'message': '无效的 JSON 数据'},
            status=400
        )
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_permission('user:delete')
async def api_delete_user(request):
    """
    删除用户（软删除）
    
    Path Parameters:
        id: 用户 ID
    """
    try:
        user_id = request.match_info['id']
        
        # 不能删除自己
        if user_id == request.get('user_id'):
            return web.json_response(
                {'success': False, 'message': '不能删除自己'},
                status=400
            )
        
        success = await UserService.delete_user(
            user_id=user_id,
            deleted_by=request.get('user_id')
        )
        
        if not success:
            return web.json_response(
                {'success': False, 'message': '用户不存在'},
                status=404
            )
        
        return web.json_response({
            'success': True,
            'message': '用户已删除'
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_permission('user:update')
async def api_activate_user(request):
    """激活用户"""
    try:
        user_id = request.match_info['id']
        
        success = await UserService.activate_user(user_id)
        
        if not success:
            return web.json_response(
                {'success': False, 'message': '用户不存在'},
                status=404
            )
        
        return web.json_response({
            'success': True,
            'message': '用户已激活'
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_permission('user:update')
async def api_ban_user(request):
    """封禁用户"""
    try:
        user_id = request.match_info['id']
        
        success = await UserService.ban_user(user_id)
        
        if not success:
            return web.json_response(
                {'success': False, 'message': '用户不存在'},
                status=404
            )
        
        return web.json_response({
            'success': True,
            'message': '用户已封禁'
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_permission('user:update')
async def api_restore_user(request):
    """恢复已删除的用户"""
    try:
        user_id = request.match_info['id']
        
        success = await UserService.restore_user(user_id)
        
        if not success:
            return web.json_response(
                {'success': False, 'message': '用户不存在'},
                status=404
            )
        
        return web.json_response({
            'success': True,
            'message': '用户已恢复'
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


# ============================================================================
# 路由注册
# ============================================================================

def setup_routes(app):
    """注册用户管理路由"""
    
    # 用户列表和创建
    app.router.add_get('/api/users', api_get_users)
    app.router.add_post('/api/users', api_create_user)
    
    # 用户详情、更新、删除
    app.router.add_get('/api/users/{id}', api_get_user)
    app.router.add_put('/api/users/{id}', api_update_user)
    app.router.add_delete('/api/users/{id}', api_delete_user)
    
    # 密码修改
    app.router.add_post('/api/users/{id}/password', api_update_password)
    
    # 状态管理
    app.router.add_post('/api/users/{id}/activate', api_activate_user)
    app.router.add_post('/api/users/{id}/ban', api_ban_user)
    app.router.add_post('/api/users/{id}/restore', api_restore_user)
