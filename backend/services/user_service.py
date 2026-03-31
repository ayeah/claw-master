"""
用户服务 - 用户 CRUD 操作
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from models.user import User, UserService
import db
import re


class UserValidationError(Exception):
    """用户验证异常"""
    pass


class UserService:
    """用户管理服务"""
    
    # 密码强度正则
    PASSWORD_PATTERN = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$')
    
    @classmethod
    def validate_username(cls, username: str) -> bool:
        """验证用户名"""
        if not username or len(username) < 3 or len(username) > 50:
            return False
        return True
    
    @classmethod
    def validate_email(cls, email: str) -> bool:
        """验证邮箱"""
        if not email:
            return False
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @classmethod
    def validate_password(cls, password: str) -> tuple[bool, str]:
        """
        验证密码强度
        Returns: (is_valid, error_message)
        """
        if not password or len(password) < 8:
            return False, '密码长度至少 8 位'
        
        if not re.search(r'[a-z]', password):
            return False, '密码必须包含小写字母'
        
        if not re.search(r'[A-Z]', password):
            return False, '密码必须包含大写字母'
        
        if not re.search(r'\d', password):
            return False, '密码必须包含数字'
        
        return True, ''
    
    @classmethod
    async def create_user(cls, username: str, email: str, password: str, 
                         display_name: str = None, role: str = 'user',
                         created_by: str = None) -> User:
        """
        创建用户
        
        Args:
            username: 用户名
            email: 邮箱
            password: 密码
            display_name: 显示名称
            role: 角色
            created_by: 创建人 ID
        
        Returns:
            User: 创建的用户对象
        
        Raises:
            UserValidationError: 验证失败
        """
        # 验证输入
        if not cls.validate_username(username):
            raise UserValidationError('用户名长度必须在 3-50 字符之间')
        
        if not cls.validate_email(email):
            raise UserValidationError('邮箱格式不正确')
        
        is_valid, error_msg = cls.validate_password(password)
        if not is_valid:
            raise UserValidationError(error_msg)
        
        # 检查用户名唯一性
        existing = await db.fetch_one(
            'SELECT id FROM users WHERE username = $1 AND deleted_at IS NULL',
            username
        )
        if existing:
            raise UserValidationError('用户名已存在')
        
        # 检查邮箱唯一性
        existing = await db.fetch_one(
            'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
            email
        )
        if existing:
            raise UserValidationError('邮箱已被使用')
        
        # 创建用户
        user_id = uuid.uuid4()
        password_hash = UserService.hash_password(password)
        
        await db.execute(
            """
            INSERT INTO users (id, username, email, password_hash, display_name, role, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'active')
            """,
            user_id, username, email, password_hash, display_name, role
        )
        
        # 获取创建的用户
        return await cls.get_user_by_id(str(user_id))
    
    @classmethod
    async def get_user_by_id(cls, user_id: str) -> Optional[User]:
        """根据 ID 查询用户"""
        row = await db.fetch_one(
            """
            SELECT * FROM users 
            WHERE id = $1 AND deleted_at IS NULL
            """,
            user_id
        )
        return User.from_row(row) if row else None
    
    @classmethod
    async def get_user_by_username(cls, username: str) -> Optional[User]:
        """根据用户名查询用户"""
        row = await db.fetch_one(
            """
            SELECT * FROM users 
            WHERE (username = $1 OR email = $1) AND deleted_at IS NULL
            """,
            username
        )
        return User.from_row(row) if row else None
    
    @classmethod
    async def get_users(cls, page: int = 1, page_size: int = 20, 
                       status: str = None, role: str = None,
                       search: str = None) -> Dict[str, Any]:
        """
        查询用户列表（分页）
        
        Returns:
            {
                'users': List[User],
                'total': int,
                'page': int,
                'page_size': int,
                'total_pages': int
            }
        """
        # 构建查询条件
        conditions = ['deleted_at IS NULL']
        params = []
        param_index = 1
        
        if status:
            conditions.append(f'status = ${param_index}')
            params.append(status)
            param_index += 1
        
        if role:
            conditions.append(f'role = ${param_index}')
            params.append(role)
            param_index += 1
        
        if search:
            conditions.append(f'(username ILIKE ${param_index} OR email ILIKE ${param_index} OR display_name ILIKE ${param_index})')
            params.append(f'%{search}%')
            param_index += 1
        
        where_clause = ' AND '.join(conditions)
        
        # 查询总数
        total = await db.fetch_val(
            f'SELECT COUNT(*) FROM users WHERE {where_clause}',
            *params
        )
        
        # 分页查询
        offset = (page - 1) * page_size
        users_rows = await db.fetch_all(
            f"""
            SELECT id, username, email, display_name, avatar_url, role, status,
                   last_login_at, created_at, updated_at
            FROM users
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ${param_index} OFFSET ${param_index + 1}
            """,
            *params, page_size, offset
        )
        
        users = [User.from_row(row) for row in users_rows]
        
        # 计算总页数
        total_pages = (total + page_size - 1) // page_size
        
        return {
            'users': users,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages
        }
    
    @classmethod
    async def update_user(cls, user_id: str, updates: Dict[str, Any], 
                         updated_by: str = None) -> Optional[User]:
        """
        更新用户信息
        
        Args:
            user_id: 用户 ID
            updates: 更新字段字典
            updated_by: 更新人 ID
        
        Returns:
            User: 更新后的用户对象
        """
        # 不允许更新的字段
        protected_fields = ['id', 'username', 'created_at', 'deleted_at']
        
        # 过滤受保护的字段
        safe_updates = {k: v for k, v in updates.items() if k not in protected_fields}
        
        if not safe_updates:
            return await cls.get_user_by_id(user_id)
        
        # 构建 UPDATE 语句
        set_clauses = []
        params = [user_id]
        param_index = 2
        
        for field, value in safe_updates.items():
            set_clauses.append(f'{field} = ${param_index}')
            params.append(value)
            param_index += 1
        
        # 添加更新时间
        set_clauses.append('updated_at = CURRENT_TIMESTAMP')
        
        await db.execute(
            f"""
            UPDATE users 
            SET {', '.join(set_clauses)}
            WHERE id = $1 AND deleted_at IS NULL
            """,
            *params
        )
        
        return await cls.get_user_by_id(user_id)
    
    @classmethod
    async def update_password(cls, user_id: str, old_password: str, 
                            new_password: str) -> bool:
        """
        修改密码
        
        Args:
            user_id: 用户 ID
            old_password: 原密码
            new_password: 新密码
        
        Returns:
            bool: 是否成功
        
        Raises:
            UserValidationError: 验证失败
        """
        # 验证新密码
        is_valid, error_msg = cls.validate_password(new_password)
        if not is_valid:
            raise UserValidationError(error_msg)
        
        # 获取用户当前密码
        user_row = await db.fetch_one(
            'SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL',
            user_id
        )
        
        if not user_row:
            raise UserValidationError('用户不存在')
        
        # 验证原密码
        if not UserService.verify_password(old_password, user_row['password_hash']):
            raise UserValidationError('原密码错误')
        
        # 更新密码
        new_hash = UserService.hash_password(new_password)
        await db.execute(
            """
            UPDATE users 
            SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
            """,
            user_id, new_hash
        )
        
        return True
    
    @classmethod
    async def delete_user(cls, user_id: str, deleted_by: str = None) -> bool:
        """
        软删除用户
        
        Args:
            user_id: 用户 ID
            deleted_by: 删除人 ID
        
        Returns:
            bool: 是否成功
        """
        result = await db.execute(
            """
            UPDATE users 
            SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
            """,
            user_id
        )
        
        return result is not None
    
    @classmethod
    async def restore_user(cls, user_id: str) -> bool:
        """恢复已删除的用户"""
        result = await db.execute(
            """
            UPDATE users 
            SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NOT NULL
            """,
            user_id
        )
        return result is not None
    
    @classmethod
    async def activate_user(cls, user_id: str) -> bool:
        """激活用户"""
        result = await db.execute(
            """
            UPDATE users 
            SET status = 'active', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
            """,
            user_id
        )
        return result is not None
    
    @classmethod
    async def ban_user(cls, user_id: str) -> bool:
        """封禁用户"""
        result = await db.execute(
            """
            UPDATE users 
            SET status = 'banned', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
            """,
            user_id
        )
        return result is not None
