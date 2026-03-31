"""
API Gateway - API Key 管理服务

功能：
- API Key 生成和验证
- API Key CRUD 操作
- 配额管理
- 限流管理
"""

import secrets
import hashlib
import time
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import json


@dataclass
class APIKey:
    """API Key 数据模型"""
    id: str
    key_hash: str
    key_prefix: str
    user_id: Optional[str] = None
    name: Optional[str] = None
    quota_type: str = 'tokens'
    quota_total: int = 0
    quota_used: int = 0
    rate_limit: int = 60
    concurrent_limit: int = 10
    enabled: bool = True
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    provider_ids: List[str] = None
    model_access: List[str] = None
    ip_whitelist: List[str] = None
    ip_blacklist: List[str] = None
    metadata: Dict[str, Any] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.provider_ids is None:
            self.provider_ids = []
        if self.model_access is None:
            self.model_access = []
        if self.ip_whitelist is None:
            self.ip_whitelist = []
        if self.ip_blacklist is None:
            self.ip_blacklist = []
        if self.metadata is None:
            self.metadata = {}


class APIKeyService:
    """API Key 管理服务"""
    
    def __init__(self, db_pool):
        self.db_pool = db_pool
        self._key_prefix = 'sk-'
        self._rate_limit_cache = {}  # 限流缓存 {key_id: {timestamp: count}}
    
    # ========================================================================
    # API Key 生成
    # ========================================================================
    
    def generate_key(self) -> Tuple[str, str, str]:
        """
        生成新的 API Key
        
        返回：(完整 Key, Key 前缀，Key 哈希)
        """
        # 生成随机字符串（32 字节 = 64 字符）
        random_part = secrets.token_hex(16)
        full_key = f"{self._key_prefix}{random_part}"
        
        # 生成前缀（显示用，如 sk-abc123）
        key_prefix = full_key[:12]
        
        # 生成哈希（存储用）
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()
        
        return full_key, key_prefix, key_hash
    
    def verify_key(self, full_key: str) -> Tuple[bool, Optional[str]]:
        """
        验证 API Key 格式
        
        返回：(是否有效，错误信息)
        """
        if not full_key:
            return False, "Key 不能为空"
        
        if not full_key.startswith(self._key_prefix):
            return False, f"Key 必须以 {self._key_prefix} 开头"
        
        if len(full_key) < 20:
            return False, "Key 长度不足"
        
        return True, None
    
    # ========================================================================
    # CRUD 操作
    # ========================================================================
    
    async def create_key(self, data: Dict[str, Any]) -> Tuple[str, APIKey]:
        """
        创建 API Key
        
        返回：(完整 Key, APIKey 对象)
        """
        # 生成 Key
        full_key, key_prefix, key_hash = self.generate_key()
        
        async with self.db_pool.acquire() as conn:
            # 检查哈希是否重复（理论上不会）
            exists = await conn.fetchval(
                "SELECT 1 FROM api_keys WHERE key_hash = $1",
                key_hash
            )
            if exists:
                raise ValueError("Key 生成失败，请重试")
            
            # 插入数据
            row = await conn.fetchrow("""
                INSERT INTO api_keys (
                    key_hash, key_prefix, user_id, name, quota_type,
                    quota_total, quota_used, rate_limit, concurrent_limit,
                    enabled, expires_at, provider_ids, model_access,
                    ip_whitelist, ip_blacklist, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *
            """,
                key_hash,
                key_prefix,
                data.get('user_id'),
                data.get('name'),
                data.get('quota_type', 'tokens'),
                data.get('quota_total', 0),
                0,  # quota_used
                data.get('rate_limit', 60),
                data.get('concurrent_limit', 10),
                data.get('enabled', True),
                data.get('expires_at'),
                json.dumps(data.get('provider_ids', [])),
                json.dumps(data.get('model_access', [])),
                data.get('ip_whitelist', []),
                data.get('ip_blacklist', []),
                json.dumps(data.get('metadata', {}))
            )
            
            api_key = self._row_to_api_key(row)
            return full_key, api_key
    
    async def get_key(self, key_id: str) -> Optional[APIKey]:
        """获取 API Key 详情"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM api_keys 
                WHERE id = $1 AND deleted_at IS NULL
            """, key_id)
            
            return self._row_to_api_key(row) if row else None
    
    async def get_key_by_hash(self, key_hash: str) -> Optional[APIKey]:
        """通过哈希获取 API Key"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM api_keys 
                WHERE key_hash = $1 AND deleted_at IS NULL
            """, key_hash)
            
            return self._row_to_api_key(row) if row else None
    
    async def get_keys(
        self,
        user_id: Optional[str] = None,
        enabled: Optional[bool] = None,
        status: Optional[str] = None,  # active/expired/all
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[APIKey], int]:
        """获取 API Key 列表"""
        async with self.db_pool.acquire() as conn:
            # 构建查询条件
            conditions = ["deleted_at IS NULL"]
            params = []
            param_count = 1
            
            if user_id:
                conditions.append(f"user_id = ${param_count}")
                params.append(user_id)
                param_count += 1
            
            if enabled is not None:
                conditions.append(f"enabled = ${param_count}")
                params.append(enabled)
                param_count += 1
            
            # 状态筛选
            now = datetime.now()
            if status == 'active':
                conditions.append(f"(expires_at IS NULL OR expires_at > ${param_count})")
                params.append(now)
                param_count += 1
            elif status == 'expired':
                conditions.append(f"expires_at IS NOT NULL AND expires_at <= ${param_count}")
                params.append(now)
                param_count += 1
            
            # 查询总数
            count_query = f"""
                SELECT COUNT(*) FROM api_keys 
                WHERE {' AND '.join(conditions)}
            """
            total = await conn.fetchval(count_query, *params)
            
            # 查询数据
            query = f"""
                SELECT * FROM api_keys 
                WHERE {' AND '.join(conditions)}
                ORDER BY created_at DESC
                LIMIT ${param_count} OFFSET ${param_count + 1}
            """
            params.extend([limit, offset])
            rows = await conn.fetch(query, *params)
            
            return [self._row_to_api_key(row) for row in rows], total
    
    async def update_key(self, key_id: str, data: Dict[str, Any]) -> Optional[APIKey]:
        """更新 API Key"""
        async with self.db_pool.acquire() as conn:
            # 检查是否存在
            exists = await conn.fetchval(
                "SELECT 1 FROM api_keys WHERE id = $1 AND deleted_at IS NULL",
                key_id
            )
            if not exists:
                return None
            
            # 构建更新字段
            updates = []
            params = []
            param_count = 1
            
            json_fields = ['provider_ids', 'model_access', 'ip_whitelist', 'ip_blacklist', 'metadata']
            
            for field in ['name', 'quota_total', 'rate_limit', 'concurrent_limit',
                         'enabled', 'expires_at', 'quota_type']:
                if field in data:
                    updates.append(f"{field} = ${param_count}")
                    params.append(data[field])
                    param_count += 1
            
            for field in json_fields:
                if field in data:
                    updates.append(f"{field} = ${param_count}")
                    params.append(json.dumps(data[field]))
                    param_count += 1
            
            if not updates:
                return await self.get_key(key_id)
            
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(key_id)
            
            query = f"""
                UPDATE api_keys 
                SET {', '.join(updates)}
                WHERE id = ${param_count} AND deleted_at IS NULL
                RETURNING *
            """
            
            row = await conn.fetchrow(query, *params)
            return self._row_to_api_key(row) if row else None
    
    async def delete_key(self, key_id: str) -> bool:
        """删除 API Key（软删除）"""
        async with self.db_pool.acquire() as conn:
            result = await conn.execute("""
                UPDATE api_keys 
                SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND deleted_at IS NULL
            """, key_id)
            
            return result.split()[-1] == '1'
    
    async def revoke_key(self, key_id: str) -> Optional[APIKey]:
        """撤销 API Key（立即失效）"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                UPDATE api_keys 
                SET enabled = false, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND deleted_at IS NULL
                RETURNING *
            """, key_id)
            
            return self._row_to_api_key(row) if row else None
    
    async def reset_quota(self, key_id: str) -> Optional[APIKey]:
        """重置 API Key 使用量"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                UPDATE api_keys 
                SET quota_used = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND deleted_at IS NULL
                RETURNING *
            """, key_id)
            
            return self._row_to_api_key(row) if row else None
    
    # ========================================================================
    # 配额管理
    # ========================================================================
    
    async def check_quota(self, key_id: str, required_tokens: int = 0) -> Tuple[bool, str]:
        """
        检查配额
        
        返回：(是否足够，错误信息)
        """
        api_key = await self.get_key(key_id)
        
        if not api_key:
            return False, "API Key 不存在"
        
        if not api_key.enabled:
            return False, "API Key 已禁用"
        
        if api_key.expires_at and api_key.expires_at < datetime.now():
            return False, "API Key 已过期"
        
        if api_key.quota_total > 0:
            remaining = api_key.quota_total - api_key.quota_used
            if required_tokens > 0 and remaining < required_tokens:
                return False, f"配额不足，剩余：{remaining}"
            elif remaining <= 0:
                return False, "配额已耗尽"
        
        return True, ""
    
    async def consume_quota(self, key_id: str, tokens: int) -> bool:
        """
        消耗配额
        
        返回：是否成功
        """
        async with self.db_pool.acquire() as conn:
            result = await conn.execute("""
                UPDATE api_keys 
                SET quota_used = quota_used + $2,
                    last_used_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND deleted_at IS NULL
            """, key_id, tokens)
            
            return result.split()[-1] == '1'
    
    async def get_quota_usage(self, key_id: str) -> Dict[str, Any]:
        """获取配额使用情况"""
        api_key = await self.get_key(key_id)
        
        if not api_key:
            return {'error': 'API Key 不存在'}
        
        remaining = api_key.quota_total - api_key.quota_used if api_key.quota_total > 0 else -1
        
        return {
            'quota_type': api_key.quota_type,
            'quota_total': api_key.quota_total,
            'quota_used': api_key.quota_used,
            'quota_remaining': remaining,
            'usage_percent': (api_key.quota_used / api_key.quota_total * 100) if api_key.quota_total > 0 else 0
        }
    
    # ========================================================================
    # 限流检查
    # ========================================================================
    
    async def check_rate_limit(self, key_id: str, ip_address: Optional[str] = None) -> Tuple[bool, str]:
        """
        检查限流
        
        返回：(是否允许，错误信息)
        """
        api_key = await self.get_key(key_id)
        
        if not api_key:
            return False, "API Key 不存在"
        
        # 检查 IP 黑名单
        if ip_address and api_key.ip_blacklist:
            if ip_address in api_key.ip_blacklist:
                return False, "IP 地址已被阻止"
        
        # 检查 IP 白名单
        if ip_address and api_key.ip_whitelist:
            if ip_address not in api_key.ip_whitelist:
                return False, "IP 地址不在白名单中"
        
        # 简单限流检查（实际应该用 Redis）
        current_time = int(time.time())
        window_start = current_time - 60  # 1 分钟窗口
        
        if key_id not in self._rate_limit_cache:
            self._rate_limit_cache[key_id] = {}
        
        # 清理过期数据
        self._rate_limit_cache[key_id] = {
            ts: count for ts, count in self._rate_limit_cache[key_id].items()
            if ts >= window_start
        }
        
        # 统计当前窗口请求数
        current_requests = sum(self._rate_limit_cache[key_id].values())
        
        if current_requests >= api_key.rate_limit:
            return False, "请求频率超限"
        
        # 记录本次请求
        if current_time not in self._rate_limit_cache[key_id]:
            self._rate_limit_cache[key_id][current_time] = 0
        self._rate_limit_cache[key_id][current_time] += 1
        
        return True, ""
    
    # ========================================================================
    # API Key 验证（用于请求认证）
    # ========================================================================
    
    async def authenticate(self, api_key_string: str) -> Tuple[Optional[APIKey], str]:
        """
        验证 API Key
        
        返回：(APIKey 对象，错误信息)
        """
        # 验证格式
        valid, error = self.verify_key(api_key_string)
        if not valid:
            return None, error
        
        # 计算哈希
        key_hash = hashlib.sha256(api_key_string.encode()).hexdigest()
        
        # 查询 Key
        api_key = await self.get_key_by_hash(key_hash)
        
        if not api_key:
            return None, "无效的 API Key"
        
        if not api_key.enabled:
            return None, "API Key 已禁用"
        
        if api_key.expires_at and api_key.expires_at < datetime.now():
            return None, "API Key 已过期"
        
        return api_key, ""
    
    # ========================================================================
    # 辅助方法
    # ========================================================================
    
    def _row_to_api_key(self, row) -> Optional[APIKey]:
        """将数据库行转换为 APIKey 对象"""
        if not row:
            return None
        
        return APIKey(
            id=str(row['id']),
            key_hash=row['key_hash'],
            key_prefix=row['key_prefix'],
            user_id=str(row['user_id']) if row['user_id'] else None,
            name=row['name'],
            quota_type=row['quota_type'],
            quota_total=row['quota_total'],
            quota_used=row['quota_used'],
            rate_limit=row['rate_limit'],
            concurrent_limit=row['concurrent_limit'],
            enabled=row['enabled'],
            expires_at=row['expires_at'],
            last_used_at=row['last_used_at'],
            provider_ids=row['provider_ids'] or [],
            model_access=row['model_access'] or [],
            ip_whitelist=row['ip_whitelist'] or [],
            ip_blacklist=row['ip_blacklist'] or [],
            metadata=row['metadata'] or {},
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            deleted_at=row['deleted_at']
        )
