"""
数据库连接模块
"""

import asyncpg
import asyncio
from typing import Optional
from contextlib import asynccontextmanager
from config.database import get_dsn, DB_POOL_CONFIG

# 全局连接池
_pool: Optional[asyncpg.Pool] = None


async def init_pool():
    """初始化数据库连接池"""
    global _pool
    if _pool is None:
        dsn = get_dsn()
        _pool = await asyncpg.create_pool(
            dsn=dsn,
            min_size=DB_POOL_CONFIG['min_size'],
            max_size=DB_POOL_CONFIG['max_size'],
            command_timeout=DB_POOL_CONFIG['command_timeout']
        )
        print("✅ 数据库连接池初始化成功")
    return _pool


async def close_pool():
    """关闭数据库连接池"""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        print("数据库连接池已关闭")


@asynccontextmanager
async def get_connection():
    """获取数据库连接"""
    if _pool is None:
        await init_pool()
    
    conn = await _pool.acquire()
    try:
        yield conn
    finally:
        await _pool.release(conn)


async def fetch_one(query, *args):
    """查询单条记录"""
    async with get_connection() as conn:
        return await conn.fetchrow(query, *args)


async def fetch_all(query, *args):
    """查询多条记录"""
    async with get_connection() as conn:
        return await conn.fetch(query, *args)


async def execute(query, *args):
    """执行 SQL 命令"""
    async with get_connection() as conn:
        return await conn.execute(query, *args)


async def fetch_val(query, *args, column=0):
    """查询单个值"""
    async with get_connection() as conn:
        return await conn.fetchval(query, *args, column=column)
