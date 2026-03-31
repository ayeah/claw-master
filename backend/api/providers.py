"""
API Gateway - 服务商管理 API

提供服务商的 CRUD 操作、健康检查等功能
"""

from aiohttp import web
import json
from typing import Dict, Any
from services.provider_service import ProviderService
from services.auth import require_login, require_permission


def setup_routes(app: web.Application):
    """注册路由"""
    
    # 服务商管理
    app.router.add_route('GET', '/api/providers', list_providers)
    app.router.add_route('POST', '/api/providers', create_provider)
    app.router.add_route('GET', '/api/providers/{id}', get_provider)
    app.router.add_route('PUT', '/api/providers/{id}', update_provider)
    app.router.add_route('DELETE', '/api/providers/{id}', delete_provider)
    app.router.add_route('POST', '/api/providers/{id}/toggle', toggle_provider)
    app.router.add_route('POST', '/api/providers/{id}/test', test_provider)
    app.router.add_route('POST', '/api/providers/health-check', health_check_all)
    
    # 负载均衡配置
    app.router.add_route('GET', '/api/providers/{id}/stats', get_provider_stats)


@require_login
@require_permission('provider:read')
async def list_providers(request: web.Request) -> web.Response:
    """获取服务商列表"""
    try:
        provider_service: ProviderService = request.app['provider_service']
        
        # 获取查询参数
        params = request.query
        provider_type = params.get('type')
        enabled = params.get('enabled')
        deployment_type = params.get('deployment_type')
        group_name = params.get('group_name')
        health_status = params.get('health_status')
        limit = int(params.get('limit', 100))
        offset = int(params.get('offset', 0))
        
        # 转换 enabled 参数
        if enabled is not None:
            enabled = enabled.lower() == 'true'
        
        # 查询服务商
        providers, total = await provider_service.get_providers(
            provider_type=provider_type,
            enabled=enabled,
            deployment_type=deployment_type,
            group_name=group_name,
            health_status=health_status,
            limit=limit,
            offset=offset
        )
        
        # 转换为响应格式
        result = {
            'data': [_provider_to_dict(p) for p in providers],
            'total': total,
            'limit': limit,
            'offset': offset
        }
        
        # 不返回敏感的 API Key
        for item in result['data']:
            if 'api_key' in item and item['api_key']:
                item['api_key'] = '***' + item['api_key'][-8:] if len(item['api_key']) > 8 else '***'
        
        return web.json_response(result)
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('provider:create')
async def create_provider(request: web.Request) -> web.Response:
    """创建服务商"""
    try:
        provider_service: ProviderService = request.app['provider_service']
        
        # 解析请求体
        data = await request.json()
        
        # 必填字段验证
        required_fields = ['name', 'type']
        for field in required_fields:
            if field not in data:
                return web.json_response({'error': f'缺少必填字段：{field}'}, status=400)
        
        # 创建服务商
        provider = await provider_service.create_provider(data)
        
        result = _provider_to_dict(provider)
        result['api_key'] = '***' + result['api_key'][-8:] if result.get('api_key') else None
        
        return web.json_response(result, status=201)
    
    except ValueError as e:
        return web.json_response({'error': str(e)}, status=400)
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('provider:read')
async def get_provider(request: web.Request) -> web.Response:
    """获取服务商详情"""
    try:
        provider_service: ProviderService = request.app['provider_service']
        provider_id = request.match_info['id']
        
        provider = await provider_service.get_provider(provider_id)
        
        if not provider:
            return web.json_response({'error': '服务商不存在'}, status=404)
        
        result = _provider_to_dict(provider)
        result['api_key'] = '***' + result['api_key'][-8:] if result.get('api_key') else None
        
        return web.json_response(result)
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('provider:update')
async def update_provider(request: web.Request) -> web.Response:
    """更新服务商"""
    try:
        provider_service: ProviderService = request.app['provider_service']
        provider_id = request.match_info['id']
        
        data = await request.json()
        
        provider = await provider_service.update_provider(provider_id, data)
        
        if not provider:
            return web.json_response({'error': '服务商不存在'}, status=404)
        
        result = _provider_to_dict(provider)
        result['api_key'] = '***' + result['api_key'][-8:] if result.get('api_key') else None
        
        return web.json_response(result)
    
    except ValueError as e:
        return web.json_response({'error': str(e)}, status=400)
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('provider:delete')
async def delete_provider(request: web.Request) -> web.Response:
    """删除服务商"""
    try:
        provider_service: ProviderService = request.app['provider_service']
        provider_id = request.match_info['id']
        
        success = await provider_service.delete_provider(provider_id)
        
        if not success:
            return web.json_response({'error': '服务商不存在'}, status=404)
        
        return web.json_response({'message': '服务商已删除'})
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('provider:update')
async def toggle_provider(request: web.Request) -> web.Response:
    """切换服务商启用状态"""
    try:
        provider_service: ProviderService = request.app['provider_service']
        provider_id = request.match_info['id']
        
        provider = await provider_service.toggle_provider(provider_id)
        
        if not provider:
            return web.json_response({'error': '服务商不存在'}, status=404)
        
        return web.json_response({
            'message': '服务商状态已更新',
            'enabled': provider.enabled
        })
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('provider:update')
async def test_provider(request: web.Request) -> web.Response:
    """测试服务商连接"""
    try:
        provider_service: ProviderService = request.app['provider_service']
        provider_id = request.match_info['id']
        
        result = await provider_service.health_check(provider_id)
        
        status_code = 200 if result['status'] == 'healthy' else 400
        return web.json_response(result, status=status_code)
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('provider:update')
async def health_check_all(request: web.Request) -> web.Response:
    """健康检查所有服务商"""
    try:
        provider_service: ProviderService = request.app['provider_service']
        
        result = await provider_service.health_check_all()
        
        return web.json_response(result)
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


@require_login
@require_permission('provider:read')
async def get_provider_stats(request: web.Request) -> web.Response:
    """获取服务商统计信息"""
    try:
        provider_service: ProviderService = request.app['provider_service']
        provider_id = request.match_info['id']
        
        provider = await provider_service.get_provider(provider_id)
        
        if not provider:
            return web.json_response({'error': '服务商不存在'}, status=404)
        
        # 从视图获取统计信息
        async with request.app['db_pool'].acquire() as conn:
            stats = await conn.fetchrow("""
                SELECT * FROM provider_stats WHERE id = $1
            """, provider_id)
        
        result = {
            **_provider_to_dict(provider),
            'statistics': dict(stats) if stats else {}
        }
        
        return web.json_response(result)
    
    except Exception as e:
        return web.json_response({'error': str(e)}, status=400)


def _provider_to_dict(provider) -> Dict[str, Any]:
    """将 Provider 对象转换为字典"""
    return {
        'id': provider.id,
        'name': provider.name,
        'type': provider.type,
        'api_base_url': provider.api_base_url,
        'api_version': provider.api_version,
        'models': provider.models,
        'group_name': provider.group_name,
        'priority': provider.priority,
        'weight': provider.weight,
        'enabled': provider.enabled,
        'deployment_type': provider.deployment_type,
        'config': provider.config,
        'health_status': provider.health_status,
        'last_health_check': provider.last_health_check.isoformat() if provider.last_health_check else None,
        'response_time_avg': provider.response_time_avg,
        'success_rate': float(provider.success_rate),
        'balance': float(provider.balance) if provider.balance else None,
        'created_at': provider.created_at.isoformat() if provider.created_at else None,
        'updated_at': provider.updated_at.isoformat() if provider.updated_at else None
    }
