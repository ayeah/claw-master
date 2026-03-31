"""
认证服务
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any
from models.user import User, Session, UserService
import db


class AuthService:
    """认证服务"""
    
    SESSION_DURATION = timedelta(days=7)  # 会话有效期 7 天
    
    @classmethod
    async def login(cls, username: str, password: str, ip_address: str = None, user_agent: str = None) -> Tuple[Optional[User], Optional[Session], Optional[str]]:
        """
        用户登录
        
        Returns:
            (user, session, error_message)
        """
        # 查询用户
        user_row = await db.fetch_one(
            """
            SELECT * FROM users 
            WHERE (username = $1 OR email = $1) 
            AND deleted_at IS NULL
            """,
            username
        )
        
        if not user_row:
            await cls._log_login(username, None, ip_address, user_agent, False, 'user_not_found')
            return None, None, '用户不存在'
        
        user = User.from_row(user_row)
        
        # 检查用户状态
        if user.status != 'active':
            await cls._log_login(username, user.id, ip_address, user_agent, False, 'account_banned')
            return None, None, '账号已被禁用'
        
        # 验证密码
        if not UserService.verify_password(password, user_row['password_hash']):
            await cls._log_login(username, user.id, ip_address, user_agent, False, 'invalid_password')
            return None, None, '密码错误'
        
        # 创建会话
        session = await cls._create_session(user.id, ip_address, user_agent)
        
        # 更新最后登录时间
        await db.execute(
            """
            UPDATE users 
            SET last_login_at = CURRENT_TIMESTAMP, 
                last_login_ip = $2 
            WHERE id = $1
            """,
            user.id,
            ip_address
        )
        
        # 记录登录日志
        await cls._log_login(username, user.id, ip_address, user_agent, True, None)
        
        return user, session, None
    
    @classmethod
    async def logout(cls, token: str) -> bool:
        """用户登出"""
        try:
            await db.execute(
                """
                UPDATE sessions 
                SET revoked_at = CURRENT_TIMESTAMP 
                WHERE token = $1 AND revoked_at IS NULL
                """,
                token
            )
            return True
        except Exception:
            return False
    
    @classmethod
    async def validate_session(cls, token: str) -> Optional[User]:
        """验证会话"""
        session_row = await db.fetch_one(
            """
            SELECT s.*, u.* 
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = $1 
              AND s.revoked_at IS NULL 
              AND s.expires_at > CURRENT_TIMESTAMP
              AND u.deleted_at IS NULL
            """,
            token
        )
        
        if not session_row:
            return None
        
        return User.from_row(session_row)
    
    @classmethod
    async def get_current_user(cls, token: str) -> Optional[Dict[str, Any]]:
        """获取当前用户信息"""
        user = await cls.validate_session(token)
        if user:
            return user.to_dict()
        return None
    
    @classmethod
    async def _create_session(cls, user_id: str, ip_address: str = None, user_agent: str = None) -> Session:
        """创建会话"""
        session_id = uuid.uuid4()
        token = UserService.generate_token()
        expires_at = datetime.utcnow() + cls.SESSION_DURATION
        
        await db.execute(
            """
            INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            session_id,
            user_id,
            token,
            ip_address,
            user_agent,
            expires_at
        )
        
        return Session(
            id=str(session_id),
            user_id=user_id,
            token=token,
            expires_at=expires_at,
            created_at=datetime.utcnow(),
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    @classmethod
    async def _log_login(cls, username: str, user_id: Optional[str], ip_address: str = None, 
                         user_agent: str = None, success: bool = False, failure_reason: str = None):
        """记录登录日志"""
        try:
            await db.execute(
                """
                INSERT INTO login_logs (username, ip_address, user_agent, success, failure_reason)
                VALUES ($1, $2, $3, $4, $5)
                """,
                username,
                ip_address,
                user_agent,
                success,
                failure_reason
            )
        except Exception as e:
            print(f"记录登录日志失败：{e}")
