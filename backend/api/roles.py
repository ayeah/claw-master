"""
角色和权限管理 API
"""

import json
from aiohttp import web
from services.permission import PermissionService, require_permission


# ============================================================================
# 角色管理 API
# ============================================================================

async def api_get_roles(request):
    """获取角色列表"""
    try:
        roles = await db.fetch_all('SELECT * FROM roles ORDER BY name')
        
        roles_data = []
        for role in roles:
            roles_data.append({
                'id': str(role['id']),
                'name': role['name'],
                'description': role['description'],
                'permissions': role['permissions'],
                'created_at': role['created_at'].isoformat() if role['created_at'] else None,
                'updated_at': role['updated_at'].isoformat() if role['updated_at'] else None
            })
        
        return web.json_response({
            'success': True,
            'data': {
                'roles': roles_data
            }
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


async def api_get_role(request):
    """获取角色详情"""
    try:
        role_name = request.match_info['name']
        
        role = await db.fetch_one(
            'SELECT * FROM roles WHERE name = $1',
            role_name
        )
        
        if not role:
            return web.json_response(
                {'success': False, 'message': '角色不存在'},
                status=404
            )
        
        return web.json_response({
            'success': True,
            'data': {
                'role': {
                    'id': str(role['id']),
                    'name': role['name'],
                    'description': role['description'],
                    'permissions': role['permissions'],
                    'created_at': role['created_at'].isoformat() if role['created_at'] else None,
                    'updated_at': role['updated_at'].isoformat() if role['updated_at'] else None
                }
            }
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_permission('role:create')
async def api_create_role(request):
    """
    创建角色
    
    Request Body:
        name: 角色名称
        description: 角色描述
        permissions: 权限列表（可选）
    """
    try:
        data = await request.json()
        
        name = data.get('name', '').strip()
        description = data.get('description', '')
        permissions = data.get('permissions', [])
        
        if not name:
            return web.json_response(
                {'success': False, 'message': '角色名称不能为空'},
                status=400
            )
        
        # 检查角色是否已存在
        existing = await db.fetch_one(
            'SELECT id FROM roles WHERE name = $1',
            name
        )
        
        if existing:
            return web.json_response(
                {'success': False, 'message': '角色已存在'},
                status=400
            )
        
        # 创建角色
        import uuid
        role_id = uuid.uuid4()
        
        await db.execute(
            """
            INSERT INTO roles (id, name, description, permissions)
            VALUES ($1, $2, $3, $4)
            """,
            role_id, name, description, permissions
        )
        
        return web.json_response({
            'success': True,
            'message': '角色创建成功',
            'data': {
                'role': {
                    'id': str(role_id),
                    'name': name,
                    'description': description,
                    'permissions': permissions
                }
            }
        }, status=201)
    
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


@require_permission('role:update')
async def api_update_role(request):
    """
    更新角色
    
    Path Parameters:
        name: 角色名称
    
    Request Body:
        description: 角色描述
        permissions: 权限列表
    """
    try:
        role_name = request.match_info['name']
        data = await request.json()
        
        # 保护系统内置角色
        system_roles = ['admin', 'user', 'guest']
        if role_name in system_roles and 'permissions' in data:
            # 允许更新内置角色的权限，但不能删除
            pass
        
        updates = []
        params = []
        param_index = 1
        
        if 'description' in data:
            updates.append(f'description = ${param_index}')
            params.append(data['description'])
            param_index += 1
        
        if 'permissions' in data:
            updates.append(f'permissions = ${param_index}')
            params.append(data['permissions'])
            param_index += 1
        
        if not updates:
            return web.json_response(
                {'success': False, 'message': '没有可更新的字段'},
                status=400
            )
        
        updates.append('updated_at = CURRENT_TIMESTAMP')
        params.append(role_name)
        
        await db.execute(
            f"""
            UPDATE roles 
            SET {', '.join(updates)}
            WHERE name = ${param_index}
            """,
            *params
        )
        
        # 清除权限缓存
        PermissionService.invalidate_cache()
        
        return web.json_response({
            'success': True,
            'message': '角色已更新'
        })
    
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


@require_permission('role:delete')
async def api_delete_role(request):
    """
    删除角色
    
    Path Parameters:
        name: 角色名称
    """
    try:
        role_name = request.match_info['name']
        
        # 保护系统内置角色
        system_roles = ['admin', 'user', 'guest']
        if role_name in system_roles:
            return web.json_response(
                {'success': False, 'message': '系统内置角色不能删除'},
                status=400
            )
        
        # 检查是否有用户使用该角色
        users_count = await db.fetch_val(
            'SELECT COUNT(*) FROM users WHERE role = $1 AND deleted_at IS NULL',
            role_name
        )
        
        if users_count > 0:
            return web.json_response(
                {'success': False, 'message': f'有 {users_count} 个用户正在使用该角色'},
                status=400
            )
        
        await db.execute(
            'DELETE FROM roles WHERE name = $1',
            role_name
        )
        
        # 清除权限缓存
        PermissionService.invalidate_cache()
        
        return web.json_response({
            'success': True,
            'message': '角色已删除'
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


# ============================================================================
# 权限管理 API
# ============================================================================

async def api_get_permissions(request):
    """获取所有权限"""
    try:
        permissions = await PermissionService.get_all_permissions()
        
        # 按分类分组
        permissions_by_category = {}
        for perm in permissions:
            if perm.category not in permissions_by_category:
                permissions_by_category[perm.category] = []
            permissions_by_category[perm.category].append({
                'code': perm.code,
                'name': perm.name,
                'description': perm.description
            })
        
        return web.json_response({
            'success': True,
            'data': {
                'permissions': permissions_by_category
            }
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


async def api_get_user_permissions(request):
    """获取指定用户的权限"""
    try:
        user_id = request.match_info['user_id']
        
        permissions = await PermissionService.get_user_permissions(user_id)
        
        return web.json_response({
            'success': True,
            'data': {
                'user_id': user_id,
                'permissions': list(permissions)
            }
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_permission('role:update')
async def api_assign_role_permissions(request):
    """
    为角色分配权限
    
    Path Parameters:
        name: 角色名称
    
    Request Body:
        permissions: 权限代码列表
    """
    try:
        role_name = request.match_info['name']
        data = await request.json()
        
        permissions = data.get('permissions', [])
        
        if not isinstance(permissions, list):
            return web.json_response(
                {'success': False, 'message': '权限必须是列表'},
                status=400
            )
        
        success = await PermissionService.assign_permissions_to_role(
            role_name=role_name,
            permissions=permissions
        )
        
        return web.json_response({
            'success': True,
            'message': '权限已分配'
        })
    
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


async def api_check_permission(request):
    """
    检查用户权限
    
    Request Body:
        user_id: 用户 ID
        permission: 权限代码
    """
    try:
        data = await request.json()
        
        user_id = data.get('user_id')
        permission = data.get('permission')
        
        if not user_id or not permission:
            return web.json_response(
                {'success': False, 'message': '缺少必要参数'},
                status=400
            )
        
        has_permission = await PermissionService.check_permission(
            user_id=user_id,
            permission=permission
        )
        
        return web.json_response({
            'success': True,
            'data': {
                'user_id': user_id,
                'permission': permission,
                'has_permission': has_permission
            }
        })
    
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


# ============================================================================
# 路由注册
# ============================================================================

def setup_routes(app):
    """注册角色和权限管理路由"""
    
    # 角色管理
    app.router.add_get('/api/roles', api_get_roles)
    app.router.add_get('/api/roles/{name}', api_get_role)
    app.router.add_post('/api/roles', api_create_role)
    app.router.add_put('/api/roles/{name}', api_update_role)
    app.router.add_delete('/api/roles/{name}', api_delete_role)
    
    # 权限管理
    app.router.add_get('/api/permissions', api_get_permissions)
    app.router.add_get('/api/users/{user_id}/permissions', api_get_user_permissions)
    app.router.add_post('/api/roles/{name}/permissions', api_assign_role_permissions)
    app.router.add_post('/api/permissions/check', api_check_permission)


# 导入 db 模块
import db
