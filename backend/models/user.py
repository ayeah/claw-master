"""
用户模型
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
import bcrypt


@dataclass
class User:
    """用户模型"""
    id: str
    username: str
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = 'user'
    status: str = 'active'
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @classmethod
    def from_row(cls, row) -> 'User':
        """从数据库行创建用户对象"""
        if row is None:
            return None
        return cls(
            id=str(row['id']),
            username=row['username'],
            email=row['email'],
            display_name=row.get('display_name'),
            avatar_url=row.get('avatar_url'),
            role=row.get('role', 'user'),
            status=row.get('status', 'active'),
            last_login_at=row.get('last_login_at'),
            created_at=row.get('created_at'),
            updated_at=row.get('updated_at')
        )
    
    def to_dict(self, include_sensitive=False) -> Dict[str, Any]:
        """转换为字典"""
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'display_name': self.display_name,
            'avatar_url': self.avatar_url,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        return data
    
    @property
    def is_admin(self) -> bool:
        """是否为管理员"""
        return self.role == 'admin'
    
    @property
    def is_active(self) -> bool:
        """是否活跃"""
        return self.status == 'active'


@dataclass
class Session:
    """会话模型"""
    id: str
    user_id: str
    token: str
    expires_at: datetime
    created_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    revoked_at: Optional[datetime] = None
    
    @classmethod
    def from_row(cls, row) -> 'Session':
        """从数据库行创建会话对象"""
        if row is None:
            return None
        return cls(
            id=str(row['id']),
            user_id=str(row['user_id']),
            token=row['token'],
            expires_at=row['expires_at'],
            created_at=row['created_at'],
            ip_address=row.get('ip_address'),
            user_agent=row.get('user_agent'),
            revoked_at=row.get('revoked_at')
        )
    
    @property
    def is_valid(self) -> bool:
        """会话是否有效"""
        now = datetime.utcnow()
        return self.revoked_at is None and self.expires_at > now
    
    @property
    def is_expired(self) -> bool:
        """会话是否过期"""
        return datetime.utcnow() > self.expires_at


class UserService:
    """用户服务"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """哈希密码"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """验证密码"""
        try:
            return bcrypt.checkpw(
                password.encode('utf-8'), 
                password_hash.encode('utf-8')
            )
        except Exception:
            return False
    
    @staticmethod
    def generate_token() -> str:
        """生成会话令牌"""
        import secrets
        return secrets.token_urlsafe(32)
