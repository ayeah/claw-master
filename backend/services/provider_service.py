"""
API Gateway - 服务商管理服务

功能：
- 服务商 CRUD 操作
- 服务商健康检查
- 服务商负载均衡
- 服务商状态管理
"""

import asyncio
import aiohttp
import hashlib
import base64
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import json


class ProviderType(str, Enum):
    """服务商类型"""
    OPENAI = 'openai'
    AZURE = 'azure'
    CLAUDE = 'claude'
    GEMINI = 'gemini'
    BAIDU = 'baidu'
    ALIYUN = 'aliyun'
    ZHIPU = 'zhipu'
    OLLAMA = 'ollama'
    LMSTUDIO = 'lmstudio'
    CUSTOM = 'custom'


class DeploymentType(str, Enum):
    """部署方式"""
    CLOUD = 'cloud'
    LOCAL = 'local'


class HealthStatus(str, Enum):
    """健康状态"""
    UNKNOWN = 'unknown'
    HEALTHY = 'healthy'
    UNHEALTHY = 'unhealthy'


@dataclass
class ProviderModel:
    """服务商模型"""
    id: str
    name: str
    max_tokens: int = 4096
    input_cost_per_1k: float = 0.0
    output_cost_per_1k: float = 0.0


@dataclass
class Provider:
    """服务商数据模型"""
    id: str
    name: str
    type: str
    api_key: Optional[str] = None
    api_base_url: Optional[str] = None
    api_version: Optional[str] = None
    models: List[str] = None
    group_name: Optional[str] = None
    priority: int = 0
    weight: int = 1
    enabled: bool = True
    deployment_type: str = 'cloud'
    config: Dict[str, Any] = None
    health_status: str = 'unknown'
    last_health_check: Optional[datetime] = None
    response_time_avg: int = 0
    success_rate: float = 100.0
    balance: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.models is None:
            self.models = []
        if self.config is None:
            self.config = {}


class ProviderService:
    """服务商管理服务"""
    
    def __init__(self, db_pool):
        self.db_pool = db_pool
        self._health_check_interval = 300  # 5 分钟
        self._health_check_timeout = 10    # 10 秒超时
    
    # ========================================================================
    # CRUD 操作
    # ========================================================================
    
    async def create_provider(self, data: Dict[str, Any]) -> Provider:
        """创建服务商"""
        async with self.db_pool.acquire() as conn:
            # 检查名称是否重复
            exists = await conn.fetchval(
                "SELECT 1 FROM providers WHERE name = $1 AND deleted_at IS NULL",
                data['name']
            )
            if exists:
                raise ValueError(f"服务商名称已存在：{data['name']}")
            
            # 插入数据
            row = await conn.fetchrow("""
                INSERT INTO providers (
                    name, type, api_key, api_base_url, api_version, models,
                    group_name, priority, weight, enabled, deployment_type,
                    config, balance
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            """,
                data.get('name'),
                data.get('type'),
                data.get('api_key'),  # 实际应该加密存储
                data.get('api_base_url'),
                data.get('api_version'),
                json.dumps(data.get('models', [])),
                data.get('group_name'),
                data.get('priority', 0),
                data.get('weight', 1),
                data.get('enabled', True),
                data.get('deployment_type', 'cloud'),
                json.dumps(data.get('config', {})),
                data.get('balance')
            )
            
            return self._row_to_provider(row)
    
    async def get_provider(self, provider_id: str) -> Optional[Provider]:
        """获取服务商详情"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM providers 
                WHERE id = $1 AND deleted_at IS NULL
            """, provider_id)
            
            return self._row_to_provider(row) if row else None
    
    async def get_providers(
        self,
        provider_type: Optional[str] = None,
        enabled: Optional[bool] = None,
        deployment_type: Optional[str] = None,
        group_name: Optional[str] = None,
        health_status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[Provider], int]:
        """获取服务商列表"""
        async with self.db_pool.acquire() as conn:
            # 构建查询条件
            conditions = ["deleted_at IS NULL"]
            params = []
            param_count = 1
            
            if provider_type:
                conditions.append(f"type = ${param_count}")
                params.append(provider_type)
                param_count += 1
            
            if enabled is not None:
                conditions.append(f"enabled = ${param_count}")
                params.append(enabled)
                param_count += 1
            
            if deployment_type:
                conditions.append(f"deployment_type = ${param_count}")
                params.append(deployment_type)
                param_count += 1
            
            if group_name:
                conditions.append(f"group_name = ${param_count}")
                params.append(group_name)
                param_count += 1
            
            if health_status:
                conditions.append(f"health_status = ${param_count}")
                params.append(health_status)
                param_count += 1
            
            # 查询总数
            count_query = f"""
                SELECT COUNT(*) FROM providers 
                WHERE {' AND '.join(conditions)}
            """
            total = await conn.fetchval(count_query, *params)
            
            # 查询数据
            query = f"""
                SELECT * FROM providers 
                WHERE {' AND '.join(conditions)}
                ORDER BY priority DESC, weight DESC, created_at DESC
                LIMIT ${param_count} OFFSET ${param_count + 1}
            """
            params.extend([limit, offset])
            rows = await conn.fetch(query, *params)
            
            return [self._row_to_provider(row) for row in rows], total
    
    async def update_provider(self, provider_id: str, data: Dict[str, Any]) -> Optional[Provider]:
        """更新服务商"""
        async with self.db_pool.acquire() as conn:
            # 检查是否存在
            exists = await conn.fetchval(
                "SELECT 1 FROM providers WHERE id = $1 AND deleted_at IS NULL",
                provider_id
            )
            if not exists:
                return None
            
            # 构建更新字段
            updates = []
            params = []
            param_count = 1
            
            for field in ['name', 'type', 'api_key', 'api_base_url', 'api_version',
                         'group_name', 'priority', 'weight', 'enabled', 
                         'deployment_type', 'config', 'balance']:
                if field in data:
                    updates.append(f"{field} = ${param_count}")
                    if field == 'config':
                        params.append(json.dumps(data[field]))
                    else:
                        params.append(data[field])
                    param_count += 1
            
            if not updates:
                return await self.get_provider(provider_id)
            
            updates.append(f"updated_at = CURRENT_TIMESTAMP")
            params.append(provider_id)
            
            query = f"""
                UPDATE providers 
                SET {', '.join(updates)}
                WHERE id = ${param_count} AND deleted_at IS NULL
                RETURNING *
            """
            
            row = await conn.fetchrow(query, *params)
            return self._row_to_provider(row) if row else None
    
    async def delete_provider(self, provider_id: str) -> bool:
        """删除服务商（软删除）"""
        async with self.db_pool.acquire() as conn:
            result = await conn.execute("""
                UPDATE providers 
                SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND deleted_at IS NULL
            """, provider_id)
            
            return result.split()[-1] == '1'
    
    async def toggle_provider(self, provider_id: str) -> Optional[Provider]:
        """切换服务商启用状态"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                UPDATE providers 
                SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND deleted_at IS NULL
                RETURNING *
            """, provider_id)
            
            return self._row_to_provider(row) if row else None
    
    # ========================================================================
    # 健康检查
    # ========================================================================
    
    async def health_check(self, provider_id: str) -> Dict[str, Any]:
        """执行服务商健康检查"""
        provider = await self.get_provider(provider_id)
        if not provider:
            return {'status': 'error', 'message': '服务商不存在'}
        
        if not provider.enabled:
            return {'status': 'skipped', 'message': '服务商已禁用'}
        
        # 根据服务商类型选择测试端点
        test_endpoint = self._get_test_endpoint(provider)
        if not test_endpoint:
            return {'status': 'skipped', 'message': '未配置 API Base URL'}
        
        start_time = datetime.now()
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self._health_check_timeout)) as session:
                headers = self._get_test_headers(provider)
                
                async with session.post(
                    f"{provider.api_base_url}{test_endpoint}",
                    headers=headers,
                    json=self._get_test_body(provider)
                ) as response:
                    response_time = (datetime.now() - start_time).total_seconds() * 1000
                    
                    if response.status in [200, 201]:
                        # 健康检查成功
                        await self._update_health_status(
                            provider_id, 
                            HealthStatus.HEALTHY,
                            response_time,
                            response.status
                        )
                        return {
                            'status': 'healthy',
                            'response_time_ms': response_time,
                            'status_code': response.status
                        }
                    else:
                        # 健康检查失败
                        await self._update_health_status(
                            provider_id,
                            HealthStatus.UNHEALTHY,
                            response_time,
                            response.status
                        )
                        return {
                            'status': 'unhealthy',
                            'response_time_ms': response_time,
                            'status_code': response.status
                        }
        
        except asyncio.TimeoutError:
            await self._update_health_status(
                provider_id,
                HealthStatus.UNHEALTHY,
                self._health_check_timeout * 1000,
                None,
                'Timeout'
            )
            return {'status': 'unhealthy', 'message': 'Timeout'}
        
        except Exception as e:
            await self._update_health_status(
                provider_id,
                HealthStatus.UNHEALTHY,
                None,
                None,
                str(e)
            )
            return {'status': 'unhealthy', 'message': str(e)}
    
    async def health_check_all(self) -> Dict[str, Any]:
        """健康检查所有服务商"""
        providers, _ = await self.get_providers(enabled=True)
        
        tasks = [self.health_check(p.id) for p in providers]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        summary = {
            'total': len(providers),
            'healthy': 0,
            'unhealthy': 0,
            'skipped': 0,
            'results': []
        }
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                summary['unhealthy'] += 1
                summary['results'].append({
                    'provider_id': providers[i].id,
                    'status': 'error',
                    'message': str(result)
                })
            elif result['status'] == 'healthy':
                summary['healthy'] += 1
                summary['results'].append({
                    'provider_id': providers[i].id,
                    **result
                })
            elif result['status'] == 'skipped':
                summary['skipped'] += 1
                summary['results'].append({
                    'provider_id': providers[i].id,
                    **result
                })
            else:
                summary['unhealthy'] += 1
                summary['results'].append({
                    'provider_id': providers[i].id,
                    **result
                })
        
        return summary
    
    async def _update_health_status(
        self,
        provider_id: str,
        status: HealthStatus,
        response_time: Optional[float],
        status_code: Optional[int],
        error_message: Optional[str] = None
    ):
        """更新服务商健康状态"""
        async with self.db_pool.acquire() as conn:
            # 更新服务商表
            update_data = {
                'health_status': status.value,
                'last_health_check': datetime.now()
            }
            
            if response_time:
                # 更新平均响应时间（简单移动平均）
                update_data['response_time_avg'] = f"""
                    COALESCE(response_time_avg, 0) * 0.9 + {response_time} * 0.1
                """
            
            await conn.execute("""
                UPDATE providers 
                SET health_status = $2,
                    last_health_check = CURRENT_TIMESTAMP,
                    response_time_avg = COALESCE(response_time_avg, 0) * 0.9 + $3 * 0.1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            """, provider_id, status.value, response_time or 0)
            
            # 记录健康检查日志
            await conn.execute("""
                INSERT INTO provider_health_logs 
                (provider_id, status, response_time_ms, status_code, error_message)
                VALUES ($1, $2, $3, $4, $5)
            """, provider_id, status.value, response_time, status_code, error_message)
    
    def _get_test_endpoint(self, provider: Provider) -> Optional[str]:
        """获取测试端点"""
        if not provider.api_base_url:
            return None
        
        type_endpoints = {
            ProviderType.OPENAI: '/v1/chat/completions',
            ProviderType.AZURE: '/openai/deployments/gpt-35-turbo/chat/completions',
            ProviderType.CLAUDE: '/v1/messages',
            ProviderType.GEMINI: '/v1/models/gemini-pro:generateContent',
            ProviderType.OLLAMA: '/api/generate',
            ProviderType.LMSTUDIO: '/v1/chat/completions',
        }
        
        return type_endpoints.get(ProviderType(provider.type), '/v1/chat/completions')
    
    def _get_test_headers(self, provider: Provider) -> Dict[str, str]:
        """获取测试请求头"""
        headers = {'Content-Type': 'application/json'}
        
        if provider.api_key:
            if provider.type == ProviderType.CLAUDE.value:
                headers['x-api-key'] = provider.api_key
                headers['anthropic-version'] = '2023-06-01'
            else:
                headers['Authorization'] = f"Bearer {provider.api_key}"
        
        return headers
    
    def _get_test_body(self, provider: Provider) -> Dict[str, Any]:
        """获取测试请求体"""
        if provider.type == ProviderType.CLAUDE.value:
            return {
                'model': 'claude-3-sonnet-20240229',
                'max_tokens': 10,
                'messages': [{'role': 'user', 'content': 'Hi'}]
            }
        elif provider.type == ProviderType.OLLAMA.value:
            return {
                'model': 'llama2',
                'prompt': 'Hi',
                'stream': False
            }
        else:
            return {
                'model': 'gpt-3.5-turbo',
                'messages': [{'role': 'user', 'content': 'Hi'}],
                'max_tokens': 10
            }
    
    # ========================================================================
    # 负载均衡
    # ========================================================================
    
    async def select_provider(
        self,
        model_name: str,
        strategy: str = 'weighted'
    ) -> Optional[Provider]:
        """根据负载均衡策略选择服务商"""
        async with self.db_pool.acquire() as conn:
            # 获取支持该模型且健康的启用服务商
            rows = await conn.fetch("""
                SELECT * FROM providers
                WHERE enabled = true
                  AND health_status = 'healthy'
                  AND deleted_at IS NULL
                  AND ($1 = ANY(models) OR array_length(models, 1) IS NULL)
                ORDER BY 
                    CASE WHEN $2 = 'priority' THEN priority ELSE 0 END DESC,
                    CASE WHEN $2 = 'weighted' THEN weight ELSE 0 END DESC,
                    CASE WHEN $2 = 'round_robin' THEN RANDOM() ELSE 0 END DESC,
                    response_time_avg ASC
            """, model_name, strategy)
            
            if not rows:
                return None
            
            # 根据策略选择
            if strategy == 'weighted':
                # 加权随机
                import random
                providers = [self._row_to_provider(row) for row in rows]
                weights = [p.weight for p in providers]
                return random.choices(providers, weights=weights)[0]
            
            elif strategy == 'priority':
                # 优先级最高
                return self._row_to_provider(rows[0])
            
            elif strategy == 'fastest':
                # 响应最快
                providers = [self._row_to_provider(row) for row in rows]
                return min(providers, key=lambda p: p.response_time_avg)
            
            else:
                # 默认返回第一个
                return self._row_to_provider(rows[0])
    
    # ========================================================================
    # 辅助方法
    # ========================================================================
    
    def _row_to_provider(self, row) -> Optional[Provider]:
        """将数据库行转换为 Provider 对象"""
        if not row:
            return None
        
        return Provider(
            id=str(row['id']),
            name=row['name'],
            type=row['type'],
            api_key=row['api_key'],
            api_base_url=row['api_base_url'],
            api_version=row['api_version'],
            models=row['models'] or [],
            group_name=row['group_name'],
            priority=row['priority'],
            weight=row['weight'],
            enabled=row['enabled'],
            deployment_type=row['deployment_type'],
            config=row['config'] or {},
            health_status=row['health_status'],
            last_health_check=row['last_health_check'],
            response_time_avg=row['response_time_avg'],
            success_rate=float(row['success_rate']),
            balance=float(row['balance']) if row['balance'] else None,
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            deleted_at=row['deleted_at']
        )
