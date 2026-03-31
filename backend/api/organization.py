"""
组织架构管理 API
提供部门管理、用户部门关联等接口
"""

import json
from aiohttp import web
from services.organization import DepartmentService, UserDepartmentService
from services.permission import require_permission, require_login
import db


# ============================================================================
# 部门管理 API
# ============================================================================

@require_login
async def api_get_departments(request):
    """
    获取部门列表
    
    Query Parameters:
        parent_id: 父部门 ID 过滤
        status: 状态过滤
        search: 搜索关键词
        tree: 是否返回树形结构 (true/false)
    """
    try:
        # 检查是否返回树形结构
        tree_mode = request.query.get('tree', 'false').lower() == 'true'
        
        if tree_mode:
            # 返回树形结构
            departments = await DepartmentService.get_department_tree()
            return web.json_response({
                'success': True,
                'data': {
                    'departments': departments,
                    'mode': 'tree'
                }
            })
        else:
            # 返回扁平列表
            parent_id = request.query.get('parent_id')
            status = request.query.get('status')
            search = request.query.get('search')
            
            departments = await DepartmentService.get_department_list(
                parent_id=parent_id,
                status=status,
                search=search
            )
            
            return web.json_response({
                'success': True,
                'data': {
                    'departments': departments,
                    'mode': 'list',
                    'total': len(departments)
                }
            })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_login
async def api_get_department(request):
    """获取部门详情"""
    try:
        department_id = request.match_info['id']
        
        department = await DepartmentService.get_department(department_id)
        
        if not department:
            return web.json_response(
                {'success': False, 'message': '部门不存在'},
                status=404
            )
        
        # 获取部门统计
        stats = await DepartmentService.get_department_stats(department_id)
        
        return web.json_response({
            'success': True,
            'data': {
                'department': department,
                'stats': stats
            }
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_permission('dept:create')
async def api_create_department(request):
    """
    创建部门
    
    Request Body:
        name: 部门名称（必填）
        code: 部门编码（必填）
        parent_id: 父部门 ID（可选）
        manager_id: 部门负责人 ID（可选）
        sort_order: 排序序号（可选，默认 0）
        description: 部门描述（可选）
        status: 状态（可选，默认 active）
    """
    try:
        data = await request.json()
        
        name = data.get('name', '').strip()
        code = data.get('code', '').strip()
        parent_id = data.get('parent_id')
        manager_id = data.get('manager_id')
        sort_order = data.get('sort_order', 0)
        description = data.get('description', '')
        status = data.get('status', 'active')
        
        # 验证必填字段
        if not name:
            return web.json_response(
                {'success': False, 'message': '部门名称不能为空'},
                status=400
            )
        
        if not code:
            return web.json_response(
                {'success': False, 'message': '部门编码不能为空'},
                status=400
            )
        
        # 创建部门
        department = await DepartmentService.create_department(
            name=name,
            code=code,
            parent_id=parent_id,
            manager_id=manager_id,
            sort_order=sort_order,
            description=description,
            status=status
        )
        
        return web.json_response({
            'success': True,
            'message': '部门创建成功',
            'data': {
                'department': department
            }
        }, status=201)
    
    except ValueError as e:
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


@require_permission('dept:update')
async def api_update_department(request):
    """
    更新部门
    
    Path Parameters:
        id: 部门 ID
    
    Request Body:
        name: 部门名称
        code: 部门编码
        parent_id: 父部门 ID
        manager_id: 部门负责人 ID
        sort_order: 排序序号
        description: 部门描述
        status: 状态
    """
    try:
        department_id = request.match_info['id']
        data = await request.json()
        
        # 提取可选字段
        updates = {}
        
        if 'name' in data:
            updates['name'] = data['name'].strip()
        
        if 'code' in data:
            updates['code'] = data['code'].strip()
        
        if 'parent_id' in data:
            updates['parent_id'] = data['parent_id']
        
        if 'manager_id' in data:
            updates['manager_id'] = data['manager_id']
        
        if 'sort_order' in data:
            updates['sort_order'] = data['sort_order']
        
        if 'description' in data:
            updates['description'] = data['description']
        
        if 'status' in data:
            updates['status'] = data['status']
        
        if not updates:
            return web.json_response(
                {'success': False, 'message': '没有可更新的字段'},
                status=400
            )
        
        # 更新部门
        department = await DepartmentService.update_department(
            department_id=department_id,
            **updates
        )
        
        return web.json_response({
            'success': True,
            'message': '部门已更新',
            'data': {
                'department': department
            }
        })
    
    except ValueError as e:
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


@require_permission('dept:delete')
async def api_delete_department(request):
    """
    删除部门（软删除）
    
    Path Parameters:
        id: 部门 ID
    """
    try:
        department_id = request.match_info['id']
        
        await DepartmentService.delete_department(department_id)
        
        return web.json_response({
            'success': True,
            'message': '部门已删除'
        })
    
    except ValueError as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=400
        )
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_login
async def api_get_department_users(request):
    """
    获取部门成员列表
    
    Path Parameters:
        id: 部门 ID
    """
    try:
        department_id = request.match_info['id']
        
        # 检查部门是否存在
        department = await DepartmentService.get_department(department_id)
        if not department:
            return web.json_response(
                {'success': False, 'message': '部门不存在'},
                status=404
            )
        
        users = await UserDepartmentService.get_department_users(department_id)
        
        return web.json_response({
            'success': True,
            'data': {
                'department': {
                    'id': department['id'],
                    'name': department['name'],
                    'code': department['code']
                },
                'users': users,
                'total': len(users)
            }
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


# ============================================================================
# 用户部门关联 API
# ============================================================================

@require_login
async def api_get_user_departments(request):
    """
    获取用户的部门列表
    
    Path Parameters:
        user_id: 用户 ID
    """
    try:
        user_id = request.match_info['user_id']
        
        departments = await UserDepartmentService.get_user_departments(user_id)
        
        return web.json_response({
            'success': True,
            'data': {
                'user_id': user_id,
                'departments': departments,
                'total': len(departments)
            }
        })
    
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_permission('dept:update')
async def api_assign_user_to_department(request):
    """
    分配用户到部门
    
    Path Parameters:
        department_id: 部门 ID
    
    Request Body:
        user_id: 用户 ID（必填）
        is_primary: 是否主部门（可选，默认 false）
    """
    try:
        department_id = request.match_info['department_id']
        data = await request.json()
        
        user_id = data.get('user_id')
        is_primary = data.get('is_primary', False)
        
        if not user_id:
            return web.json_response(
                {'success': False, 'message': '用户 ID 不能为空'},
                status=400
            )
        
        result = await UserDepartmentService.assign_user_to_department(
            user_id=user_id,
            department_id=department_id,
            is_primary=is_primary
        )
        
        return web.json_response({
            'success': True,
            'message': '用户已分配到部门',
            'data': {
                'departments': result
            }
        })
    
    except ValueError as e:
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


@require_permission('dept:update')
async def api_remove_user_from_department(request):
    """
    从部门移除用户
    
    Path Parameters:
        department_id: 部门 ID
        user_id: 用户 ID
    """
    try:
        department_id = request.match_info['department_id']
        user_id = request.match_info['user_id']
        
        await UserDepartmentService.remove_user_from_department(
            user_id=user_id,
            department_id=department_id
        )
        
        return web.json_response({
            'success': True,
            'message': '用户已从部门移除'
        })
    
    except ValueError as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=400
        )
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


@require_permission('dept:update')
async def api_set_primary_department(request):
    """
    设置用户的主部门
    
    Path Parameters:
        department_id: 部门 ID
        user_id: 用户 ID
    """
    try:
        department_id = request.match_info['department_id']
        user_id = request.match_info['user_id']
        
        await UserDepartmentService.set_primary_department(
            user_id=user_id,
            department_id=department_id
        )
        
        return web.json_response({
            'success': True,
            'message': '主部门已设置'
        })
    
    except ValueError as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=400
        )
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': str(e)},
            status=500
        )


# ============================================================================
# 权限管理 API（补充）
# ============================================================================

@require_login
async def api_get_permissions(request):
    """获取所有权限"""
    try:
        rows = await db.fetch_all(
            """
            SELECT code, name, description, category
            FROM permissions
            ORDER BY category, code
            """
        )
        
        # 按分类分组
        permissions_by_category = {}
        for row in rows:
            category = row['category'] or '其他'
            if category not in permissions_by_category:
                permissions_by_category[category] = []
            permissions_by_category[category].append({
                'code': row['code'],
                'name': row['name'],
                'description': row['description']
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


# ============================================================================
# 路由注册
# ============================================================================

def setup_routes(app):
    """注册组织架构管理路由"""
    
    # 部门管理
    app.router.add_get('/api/departments', api_get_departments)
    app.router.add_get('/api/departments/{id}', api_get_department)
    app.router.add_post('/api/departments', api_create_department)
    app.router.add_put('/api/departments/{id}', api_update_department)
    app.router.add_delete('/api/departments/{id}', api_delete_department)
    
    # 部门成员
    app.router.add_get('/api/departments/{id}/users', api_get_department_users)
    
    # 用户部门关联
    app.router.add_get('/api/users/{user_id}/departments', api_get_user_departments)
    app.router.add_post('/api/departments/{department_id}/users', api_assign_user_to_department)
    app.router.add_delete('/api/departments/{department_id}/users/{user_id}', api_remove_user_from_department)
    app.router.add_post('/api/departments/{department_id}/users/{user_id}/primary', api_set_primary_department)
    
    # 权限管理
    app.router.add_get('/api/permissions', api_get_permissions)
