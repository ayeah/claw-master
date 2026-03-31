"""
OpenClaw 数据库配置
"""

import os
from urllib.parse import urlparse

# 数据库连接配置
DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://user_xKQftk:password_yP7FCG@postgresql:5432/claw-master'
)

# 解析数据库 URL
parsed = urlparse(DATABASE_URL)
DB_CONFIG = {
    'host': parsed.hostname or 'postgresql',
    'port': parsed.port or 5432,
    'database': parsed.path.lstrip('/') or 'claw-master',
    'user': parsed.username or 'user_xKQftk',
    'password': parsed.password or 'password_yP7FCG',
}

# 连接池配置
DB_POOL_CONFIG = {
    'min_size': 2,
    'max_size': 10,
    'command_timeout': 30,
}

def get_dsn():
    """获取数据库连接字符串"""
    return f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
