"""
权限服务 - RBAC 权限检查
"""

from typing import List, Set, Optional
from dataclasses import dataclass
import db


@dataclass
class Permission:
    """权限定义"""
    code: str
    name: str
    description: str
    category: str


class PermissionService:
    """权限服务"""
    
    # 权限缓存
    _permission_cache = {}
    
    @classmethod
    async def get_user_permissions(cls, user_id: str) -> Set[str]:
        """
        获取用户权限列表
        
        Args:
            user_id: 用户 ID
        
        Returns:
            Set[str]: 权限代码集合
        """
        # 检查缓存
        cache_key = f"user:{user_id}"
        if cache_key in cls._permission_cache:
            return cls._permission_cache[cache_key]
        
        # 查询用户角色
        user_row = await db.fetch_one(
            'SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL',
            user_id
        )
        
        if not user_row:
            return set()
        
        role_name = user_row['role']
        
        # 查询角色权限
        role_row = await db.fetch_one(
            'SELECT permissions FROM roles WHERE name = $1',
            role_name
        )
        
        if not role_row:
            return set()
        
        permissions = role_row['permissions']
        
        # 如果有通配符权限，返回所有权限
        if '*' in permissions:
            all_perms = await cls.get_all_permissions()
            perm_set = {p.code for p in all_perms}
        else:
            perm_set = set(permissions)
        
        # 缓存权限（5 分钟）
        cls._permission_cache[cache_key] = perm_set
        
        return perm_set
    
    @classmethod
    async def check_permission(cls, user_id: str, permission: str) -> bool:
        """
        检查用户是否有指定权限
        
        Args:
            user_id: 用户 ID
            permission: 权限代码（如：user:create）
        
        Returns:
            bool: 是否有权限
        """
        user_perms = await cls.get_user_permissions(user_id)
        
        # 检查是否有通配符权限
        if '*' in user_perms:
            return True
        
        # 检查具体权限
        return permission in user_perms
    
    @classmethod
    async def check_role(cls, user_id: str, required_role: str) -> bool:
        """
        检查用户是否有指定角色
        
        Args:
            user_id: 用户 ID
            required_role: 角色名称
        
        Returns:
            bool: 是否有该角色
        """
        user_row = await db.fetch_one(
            'SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL',
            user_id
        )
        
        if not user_row:
            return False
        
        return user_row['role'] == required_role
    
    @classmethod
    async def get_all_permissions(cls) -> List[Permission]:
        """获取所有可用权限"""
        rows = await db.fetch_all(
            'SELECT code, name, description, category FROM permissions ORDER BY category, code'
        )
        
        return [Permission(
            code=row['code'],
            name=row['name'],
            description=row['description'],
            category=row['category']
        ) for row in rows]
    
    @classmethod
    async def get_permissions_by_category(cls, category: str) -> List[Permission]:
        """按分类获取权限"""
        rows = await db.fetch_all(
            'SELECT code, name, description, category FROM permissions WHERE category = $1',
            category
        )
        
        return [Permission(
            code=row['code'],
            name=row['name'],
            description=row['description'],
            category=row['category']
        ) for row in rows]
    
    @classmethod
    async def assign_permissions_to_role(cls, role_name: str, 
                                        permissions: List[str]) -> bool:
        """
        为角色分配权限
        
        Args:
            role_name: 角色名称
            permissions: 权限代码列表
        
        Returns:
            bool: 是否成功
        """
        await db.execute(
            'UPDATE roles SET permissions = $2 WHERE name = $1',
            role_name, permissions
        )
        
        # 清除缓存
        cls._permission_cache.clear()
        
        return True
    
    @classmethod
    async def get_role_permissions(cls, role_name: str) -> List[str]:
        """获取角色的权限列表"""
        role_row = await db.fetch_one(
            'SELECT permissions FROM roles WHERE name = $1',
            role_name
        )
        
        if not role_row:
            return []
        
        return role_row['permissions']
    
    @classmethod
    def invalidate_cache(cls, user_id: str = None):
        """
        清除权限缓存
        
        Args:
            user_id: 可选，清除指定用户的缓存，不传则清除所有
        """
        if user_id:
            cache_key = f"user:{user_id}"
            if cache_key in cls._permission_cache:
                del cls._permission_cache[cache_key]
        else:
            cls._permission_cache.clear()


# ============================================================================
# 权限装饰器
# ============================================================================

from functools import wraps
from aiohttp import web


def require_permission(permission: str):
    """
    权限检查装饰器
    
    使用示例:
        @require_permission('user:create')
        async def api_create_user(request):
            # 创建用户逻辑
            pass
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request, *args, **kwargs):
            # 获取当前用户
            token = request.cookies.get('session_token')
            
            if not token:
                return web.json_response(
                    {'success': False, 'message': '未登录'},
                    status=401
                )
            
            # 验证会话并获取用户
            from services.auth import AuthService
            user = await AuthService.validate_session(token)
            
            if not user:
                return web.json_response(
                    {'success': False, 'message': '会话已过期'},
                    status=401
                )
            
            # 检查权限
            has_permission = await PermissionService.check_permission(user.id, permission)
            
            if not has_permission:
                return web.json_response(
                    {'success': False, 'message': f'权限不足：{permission}'},
                    status=403
                )
            
            # 添加用户信息到请求
            request['current_user'] = user
            request['user_id'] = user.id
            
            return await func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def require_role(role: str):
    """
    角色检查装饰器
    
    使用示例:
        @require_role('admin')
        async def admin_only_api(request):
            # 仅管理员可访问
            pass
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request, *args, **kwargs):
            # 获取当前用户
            token = request.cookies.get('session_token')
            
            if not token:
                return web.json_response(
                    {'success': False, 'message': '未登录'},
                    status=401
                )
            
            from services.auth import AuthService
            user = await AuthService.validate_session(token)
            
            if not user:
                return web.json_response(
                    {'success': False, 'message': '会话已过期'},
                    status=401
                )
            
            # 检查角色
            if user.role != role:
                return web.json_response(
                    {'success': False, 'message': f'需要 {role} 角色'},
                    status=403
                )
            
            request['current_user'] = user
            request['user_id'] = user.id
            
            return await func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def require_login(func):
    """
    登录检查装饰器
    
    使用示例:
        @require_login
        async def protected_api(request):
            # 需要登录
            pass
    """
    @wraps(func)
    async def wrapper(request, *args, **kwargs):
        token = request.cookies.get('session_token')
        
        if not token:
            return web.json_response(
                {'success': False, 'message': '未登录'},
                status=401
            )
        
        from services.auth import AuthService
        user = await AuthService.validate_session(token)
        
        if not user:
            return web.json_response(
                {'success': False, 'message': '会话已过期'},
                status=401
            )
        
        request['current_user'] = user
        request['user_id'] = user.id
        
        return await func(request, *args, **kwargs)
    
    return wrapper
