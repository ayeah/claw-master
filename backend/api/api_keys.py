"""
API Gateway - API Key 管理 API

提供 API Key 的生成、验证、配额管理等功能
"""

from aiohttp import web
import json
from typing import Dict, Any
from services.api_key_service import APIKeyService
from services.auth import require_login, require_permission


def setup_routes(app: web.Application):
    """注册路由"""
    
    # API Key 管理
    app.router.add_route('GET', '/api/keys', list_keys)
    app.router.add_route('POST', '/api/keys', create_key)
    app.router.add_route('GET', '/api/keys/{id}', get_key)
    app.router.add_route('PUT', '/api/keys/{id}', update_key)
    app.router.add_route('DELETE', '/api/keys/{id}', delete_key)
    app.router.add_route('POST', '/api/keys/{id}/revoke', revoke_key)
    app.router.add_route('POST', '/api/keys/{id}/reset-quota', reset_quota)
    app.router.add_route('GET', '/api/keys/{id}/usage', get_usage)
    
    # 当前用户的 Key
    app.router.add_route('GET', '/api/user/keys', get_user_keys)


@require_login
@require_permission('api_key:read')
async def list_keys(request: web.Request) -> web.Response:
    """获取 API Key 列表"""
    try:
        api_key_service: APIKeyService = request.app['api_key_service']
        
        # 获取查询参数
        params = request.query
        user_id = params.get('user_id')
        enabled = params.get('enabled')
        status = params.get('status')  # active/expired/all
        limit = int(params.get('limit', 100))
        offset = int(params.get('offset', 0))
        
        # 转换 enabled 参数
        if enabled is not None:
            enabled = enabled.lower() == 'true'
        
        # 查询 API Key
        keys, total = await api_key_service.get_keys(
            user_id=user_id,
            enabled=enabled,
            status=status,
            limit=limit,
            offset=offset
        )
        
        result = {
            'data': [_key_to_dict(k) for k in keys],
            'total': total,
            'limit': limit,
            'offset': offset
        }
        
        return web.json_response(result)
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('api_key:create')
async def create_key(request: web.Request) -> web.Response:
    """创建 API Key"""
    try:
        api_key_service: APIKeyService = request.app['api_key_service']
        
        # 解析请求体
        data = await request.json()
        
        # 创建 API Key
        full_key, api_key = await api_key_service.create_key(data)
        
        result = {
            'key': full_key,  # 只在创建时返回完整 Key
            'api_key': _key_to_dict(api_key)
        }
        
        return web.json_response(result, status=201)
    
    except ValueError as e:
        return web.json_response({'error': str(e)}, status=400)
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('api_key:read')
async def get_key(request: web.Request) -> web.Response:
    """获取 API Key 详情"""
    try:
        api_key_service: APIKeyService = request.app['api_key_service']
        key_id = request.match_info['id']
        
        key = await api_key_service.get_key(key_id)
        
        if not key:
            return web.json_response({'error': 'API Key 不存在'}, status=404)
        
        return web.json_response(_key_to_dict(key))
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('api_key:update')
async def update_key(request: web.Request) -> web.Response:
    """更新 API Key"""
    try:
        api_key_service: APIKeyService = request.app['api_key_service']
        key_id = request.match_info['id']
        
        data = await request.json()
        
        key = await api_key_service.update_key(key_id, data)
        
        if not key:
            return web.json_response({'error': 'API Key 不存在'}, status=404)
        
        return web.json_response(_key_to_dict(key))
    
    except ValueError as e:
        return web.json_response({'error': str(e)}, status=400)
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('api_key:delete')
async def delete_key(request: web.Request) -> web.Response:
    """删除 API Key"""
    try:
        api_key_service: APIKeyService = request.app['api_key_service']
        key_id = request.match_info['id']
        
        success = await api_key_service.delete_key(key_id)
        
        if not success:
            return web.json_response({'error': 'API Key 不存在'}, status=404)
        
        return web.json_response({'message': 'API Key 已删除'})
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('api_key:update')
async def revoke_key(request: web.Request) -> web.Response:
    """撤销 API Key"""
    try:
        api_key_service: APIKeyService = request.app['api_key_service']
        key_id = request.match_info['id']
        
        key = await api_key_service.revoke_key(key_id)
        
        if not key:
            return web.json_response({'error': 'API Key 不存在'}, status=404)
        
        return web.json_response({
            'message': 'API Key 已撤销',
            'enabled': key.enabled
        })
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('api_key:update')
async def reset_quota(request: web.Request) -> web.Response:
    """重置 API Key 配额"""
    try:
        api_key_service: APIKeyService = request.app['api_key_service']
        key_id = request.match_info['id']
        
        key = await api_key_service.reset_quota(key_id)
        
        if not key:
            return web.json_response({'error': 'API Key 不存在'}, status=404)
        
        return web.json_response({
            'message': '配额已重置',
            'quota_used': key.quota_used
        })
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('api_key:read')
async def get_usage(request: web.Request) -> web.Response:
    """获取 API Key 使用量"""
    try:
        api_key_service: APIKeyService = request.app['api_key_service']
        key_id = request.match_info['id']
        
        usage = await api_key_service.get_quota_usage(key_id)
        
        return web.json_response(usage)
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
async def get_user_keys(request: web.Request) -> web.Response:
    """获取当前用户的 API Key 列表"""
    try:
        api_key_service: APIKeyService = request.app['api_key_service']
        
        # 从会话获取用户 ID
        session = await request.app['session_service'].get_session(request)
        user_id = str(session['user_id'])
        
        # 查询用户的 API Key
        keys, total = await api_key_service.get_keys(user_id=user_id, limit=100)
        
        result = {
            'data': [_key_to_dict(k) for k in keys],
            'total': total
        }
        
        return web.json_response(result)
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


def _key_to_dict(key) -> Dict[str, Any]:
    """将 APIKey 对象转换为字典"""
    return {
        'id': key.id,
        'key_prefix': key.key_prefix,  # 只显示前缀
        'user_id': key.user_id,
        'name': key.name,
        'quota_type': key.quota_type,
        'quota_total': key.quota_total,
        'quota_used': key.quota_used,
        'rate_limit': key.rate_limit,
        'concurrent_limit': key.concurrent_limit,
        'enabled': key.enabled,
        'expires_at': key.expires_at.isoformat() if key.expires_at else None,
        'last_used_at': key.last_used_at.isoformat() if key.last_used_at else None,
        'provider_ids': key.provider_ids,
        'model_access': key.model_access,
        'ip_whitelist': key.ip_whitelist,
        'ip_blacklist': key.ip_blacklist,
        'metadata': key.metadata,
        'created_at': key.created_at.isoformat() if key.created_at else None,
        'updated_at': key.updated_at.isoformat() if key.updated_at else None,
        'status': 'expired' if (key.expires_at and key.expires_at < key.created_at) else ('active' if key.enabled else 'disabled')
    }
