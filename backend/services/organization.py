"""
组织架构服务
提供部门管理、用户部门关联等功能
"""

import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
import db


class DepartmentService:
    """部门服务类"""
    
    # ========================================================================
    # 部门 CRUD
    # ========================================================================
    
    @staticmethod
    async def create_department(
        name: str,
        code: str,
        parent_id: Optional[str] = None,
        manager_id: Optional[str] = None,
        sort_order: int = 0,
        description: str = '',
        status: str = 'active'
    ) -> Dict[str, Any]:
        """
        创建部门
        
        Args:
            name: 部门名称
            code: 部门编码
            parent_id: 父部门 ID
            manager_id: 部门负责人 ID
            sort_order: 排序序号
            description: 部门描述
            status: 状态
        
        Returns:
            创建的部门信息
        """
        department_id = uuid.uuid4()
        
        # 检查部门编码是否已存在
        existing = await db.fetch_one(
            'SELECT id FROM departments WHERE code = $1 AND deleted_at IS NULL',
            code
        )
        
        if existing:
            raise ValueError(f'部门编码 {code} 已存在')
        
        # 如果是子部门，检查父部门是否存在
        if parent_id:
            parent = await db.fetch_one(
                'SELECT id FROM departments WHERE id = $1 AND deleted_at IS NULL',
                parent_id
            )
            if not parent:
                raise ValueError('父部门不存在')
        
        # 如果指定了负责人，检查用户是否存在
        if manager_id:
            user = await db.fetch_one(
                'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
                manager_id
            )
            if not user:
                raise ValueError('负责人用户不存在')
        
        # 创建部门
        await db.execute(
            """
            INSERT INTO departments (
                id, name, code, parent_id, manager_id, 
                sort_order, description, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            department_id, name, code, parent_id, manager_id, 
            sort_order, description, status
        )
        
        # 返回部门信息
        return await DepartmentService.get_department(str(department_id))
    
    @staticmethod
    async def get_department(department_id: str) -> Optional[Dict[str, Any]]:
        """
        获取部门详情
        
        Args:
            department_id: 部门 ID
        
        Returns:
            部门信息，不存在返回 None
        """
        row = await db.fetch_one(
            """
            SELECT 
                d.id, d.name, d.code, d.parent_id, d.manager_id,
                d.sort_order, d.status, d.description,
                d.created_at, d.updated_at,
                p.name as parent_name,
                m.username as manager_username,
                m.display_name as manager_name
            FROM departments d
            LEFT JOIN departments p ON d.parent_id = p.id
            LEFT JOIN users m ON d.manager_id = m.id
            WHERE d.id = $1 AND d.deleted_at IS NULL
            """,
            department_id
        )
        
        if not row:
            return None
        
        return {
            'id': str(row['id']),
            'name': row['name'],
            'code': row['code'],
            'parent_id': str(row['parent_id']) if row['parent_id'] else None,
            'parent_name': row['parent_name'],
            'manager_id': str(row['manager_id']) if row['manager_id'] else None,
            'manager_username': row['manager_username'],
            'manager_name': row['manager_name'],
            'sort_order': row['sort_order'],
            'status': row['status'],
            'description': row['description'],
            'created_at': row['created_at'].isoformat() if row['created_at'] else None,
            'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None
        }
    
    @staticmethod
    async def get_department_tree() -> List[Dict[str, Any]]:
        """
        获取部门树（完整层级结构）
        
        Returns:
            部门树列表
        """
        rows = await db.fetch_all(
            """
            SELECT 
                id, name, code, parent_id, manager_id,
                sort_order, status, description,
                level, full_name
            FROM department_tree
            ORDER BY path
            """
        )
        
        # 转换为树形结构
        def build_tree(nodes, parent_id=None):
            tree = []
            for node in nodes:
                if node['parent_id'] == parent_id:
                    branch = {
                        'id': str(node['id']),
                        'name': node['name'],
                        'code': node['code'],
                        'level': node['level'],
                        'full_name': node['full_name'],
                        'manager_id': str(node['manager_id']) if node['manager_id'] else None,
                        'sort_order': node['sort_order'],
                        'status': node['status'],
                        'description': node['description'],
                        'children': build_tree(nodes, node['id'])
                    }
                    tree.append(branch)
            return sorted(tree, key=lambda x: x['sort_order'])
        
        # 转换为字典列表
        nodes = [dict(row) for row in rows]
        return build_tree(nodes)
    
    @staticmethod
    async def get_department_list(
        parent_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        获取部门列表（扁平）
        
        Args:
            parent_id: 父部门 ID 过滤
            status: 状态过滤
            search: 搜索关键词
        
        Returns:
            部门列表
        """
        query = """
            SELECT 
                id, name, code, parent_id, manager_id,
                sort_order, status, description,
                created_at, updated_at
            FROM departments
            WHERE deleted_at IS NULL
        """
        
        params = []
        conditions = ['deleted_at IS NULL']
        param_index = 1
        
        if parent_id:
            conditions.append(f'parent_id = ${param_index}')
            params.append(parent_id)
            param_index += 1
        
        if status:
            conditions.append(f'status = ${param_index}')
            params.append(status)
            param_index += 1
        
        if search:
            conditions.append(f'(name ILIKE ${param_index} OR code ILIKE ${param_index})')
            params.append(f'%{search}%')
            param_index += 1
        
        if conditions:
            query += ' AND ' + ' AND '.join(conditions)
        
        query += ' ORDER BY sort_order, name'
        
        rows = await db.fetch_all(query, *params)
        
        return [
            {
                'id': str(row['id']),
                'name': row['name'],
                'code': row['code'],
                'parent_id': str(row['parent_id']) if row['parent_id'] else None,
                'manager_id': str(row['manager_id']) if row['manager_id'] else None,
                'sort_order': row['sort_order'],
                'status': row['status'],
                'description': row['description'],
                'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None
            }
            for row in rows
        ]
    
    @staticmethod
    async def update_department(
        department_id: str,
        name: Optional[str] = None,
        code: Optional[str] = None,
        parent_id: Optional[str] = None,
        manager_id: Optional[str] = None,
        sort_order: Optional[int] = None,
        description: Optional[str] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        更新部门
        
        Args:
            department_id: 部门 ID
            name: 部门名称
            code: 部门编码
            parent_id: 父部门 ID
            manager_id: 部门负责人 ID
            sort_order: 排序序号
            description: 部门描述
            status: 状态
        
        Returns:
            更新后的部门信息
        """
        updates = []
        params = []
        param_index = 1
        
        # 保护默认部门
        system_departments = [
            '00000000-0000-0000-0000-000000000001',  # HEAD
            '00000000-0000-0000-0000-000000000002',  # TECH
            '00000000-0000-0000-0000-000000000003',  # PROD
        ]
        
        if department_id in system_departments and code:
            raise ValueError('系统默认部门不能修改编码')
        
        if name is not None:
            updates.append(f'name = ${param_index}')
            params.append(name)
            param_index += 1
        
        if code is not None:
            # 检查新编码是否已被其他部门使用
            existing = await db.fetch_one(
                'SELECT id FROM departments WHERE code = $1 AND id != $2 AND deleted_at IS NULL',
                code, department_id
            )
            if existing:
                raise ValueError(f'部门编码 {code} 已存在')
            
            updates.append(f'code = ${param_index}')
            params.append(code)
            param_index += 1
        
        if parent_id is not None:
            # 不能将自己设为父部门
            if parent_id == department_id:
                raise ValueError('不能将自己设为父部门')
            
            # 检查父部门是否存在
            if parent_id:
                parent = await db.fetch_one(
                    'SELECT id FROM departments WHERE id = $1 AND deleted_at IS NULL',
                    parent_id
                )
                if not parent:
                    raise ValueError('父部门不存在')
            
            updates.append(f'parent_id = ${param_index}')
            params.append(parent_id)
            param_index += 1
        
        if manager_id is not None:
            if manager_id:
                user = await db.fetch_one(
                    'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
                    manager_id
                )
                if not user:
                    raise ValueError('负责人用户不存在')
            
            updates.append(f'manager_id = ${param_index}')
            params.append(manager_id)
            param_index += 1
        
        if sort_order is not None:
            updates.append(f'sort_order = ${param_index}')
            params.append(sort_order)
            param_index += 1
        
        if description is not None:
            updates.append(f'description = ${param_index}')
            params.append(description)
            param_index += 1
        
        if status is not None:
            updates.append(f'status = ${param_index}')
            params.append(status)
            param_index += 1
        
        if not updates:
            raise ValueError('没有可更新的字段')
        
        updates.append('updated_at = CURRENT_TIMESTAMP')
        params.append(department_id)
        
        await db.execute(
            f"""
            UPDATE departments 
            SET {', '.join(updates)}
            WHERE id = ${param_index}
            """,
            *params
        )
        
        return await DepartmentService.get_department(department_id)
    
    @staticmethod
    async def delete_department(department_id: str) -> bool:
        """
        删除部门（软删除）
        
        Args:
            department_id: 部门 ID
        
        Returns:
            是否删除成功
        """
        # 保护系统默认部门
        system_departments = [
            '00000000-0000-0000-0000-000000000001',  # HEAD
        ]
        
        if department_id in system_departments:
            raise ValueError('系统默认部门不能删除')
        
        # 检查是否有子部门
        children = await db.fetch_val(
            'SELECT COUNT(*) FROM departments WHERE parent_id = $1 AND deleted_at IS NULL',
            department_id
        )
        
        if children > 0:
            raise ValueError(f'部门下有 {children} 个子部门，不能删除')
        
        # 检查是否有用户
        users = await db.fetch_val(
            'SELECT COUNT(*) FROM user_departments WHERE department_id = $1',
            department_id
        )
        
        if users > 0:
            raise ValueError(f'部门下有 {users} 个用户，不能删除')
        
        await db.execute(
            """
            UPDATE departments 
            SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
            """,
            department_id
        )
        
        return True
    
    @staticmethod
    async def get_department_stats(department_id: str) -> Dict[str, Any]:
        """
        获取部门统计信息
        
        Args:
            department_id: 部门 ID
        
        Returns:
            统计信息
        """
        row = await db.fetch_one(
            """
            SELECT 
                user_count,
                primary_user_count
            FROM department_stats
            WHERE id = $1
            """,
            department_id
        )
        
        if not row:
            return {'user_count': 0, 'primary_user_count': 0}
        
        return {
            'user_count': row['user_count'],
            'primary_user_count': row['primary_user_count']
        }


class UserDepartmentService:
    """用户部门关联服务"""
    
    @staticmethod
    async def assign_user_to_department(
        user_id: str,
        department_id: str,
        is_primary: bool = False
    ) -> Dict[str, Any]:
        """
        分配用户到部门
        
        Args:
            user_id: 用户 ID
            department_id: 部门 ID
            is_primary: 是否主部门
        
        Returns:
            关联信息
        """
        # 检查用户是否存在
        user = await db.fetch_one(
            'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
            user_id
        )
        if not user:
            raise ValueError('用户不存在')
        
        # 检查部门是否存在
        dept = await db.fetch_one(
            'SELECT id FROM departments WHERE id = $1 AND deleted_at IS NULL',
            department_id
        )
        if not dept:
            raise ValueError('部门不存在')
        
        # 如果设为主部门，先取消该用户其他主部门
        if is_primary:
            await db.execute(
                """
                UPDATE user_departments 
                SET is_primary = false 
                WHERE user_id = $1
                """,
                user_id
            )
        
        # 创建关联（使用 ON CONFLICT 处理重复）
        await db.execute(
            """
            INSERT INTO user_departments (user_id, department_id, is_primary)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, department_id) DO UPDATE
            SET is_primary = $3, joined_at = CURRENT_TIMESTAMP
            """,
            user_id, department_id, is_primary
        )
        
        return await UserDepartmentService.get_user_departments(user_id)
    
    @staticmethod
    async def get_user_departments(user_id: str) -> List[Dict[str, Any]]:
        """
        获取用户的部门列表
        
        Args:
            user_id: 用户 ID
        
        Returns:
            部门列表
        """
        rows = await db.fetch_all(
            """
            SELECT 
                ud.id, ud.user_id, ud.department_id, ud.is_primary, ud.joined_at,
                d.name as department_name,
                d.code as department_code,
                d.parent_id
            FROM user_departments ud
            JOIN departments d ON ud.department_id = d.id
            WHERE ud.user_id = $1 AND d.deleted_at IS NULL
            ORDER BY ud.is_primary DESC, d.name
            """,
            user_id
        )
        
        return [
            {
                'id': str(row['id']),
                'user_id': str(row['user_id']),
                'department_id': str(row['department_id']),
                'department_name': row['department_name'],
                'department_code': row['department_code'],
                'is_primary': row['is_primary'],
                'joined_at': row['joined_at'].isoformat() if row['joined_at'] else None
            }
            for row in rows
        ]
    
    @staticmethod
    async def get_department_users(department_id: str) -> List[Dict[str, Any]]:
        """
        获取部门成员列表
        
        Args:
            department_id: 部门 ID
        
        Returns:
            用户列表
        """
        rows = await db.fetch_all(
            """
            SELECT 
                ud.id, ud.user_id, ud.is_primary, ud.joined_at,
                u.username,
                u.email,
                u.display_name,
                u.role,
                u.status
            FROM user_departments ud
            JOIN users u ON ud.user_id = u.id
            WHERE ud.department_id = $1 AND u.deleted_at IS NULL
            ORDER BY ud.is_primary DESC, u.display_name
            """,
            department_id
        )
        
        return [
            {
                'id': str(row['id']),
                'user_id': str(row['user_id']),
                'username': row['username'],
                'email': row['email'],
                'display_name': row['display_name'],
                'role': row['role'],
                'status': row['status'],
                'is_primary': row['is_primary'],
                'joined_at': row['joined_at'].isoformat() if row['joined_at'] else None
            }
            for row in rows
        ]
    
    @staticmethod
    async def remove_user_from_department(
        user_id: str,
        department_id: str
    ) -> bool:
        """
        从部门移除用户
        
        Args:
            user_id: 用户 ID
            department_id: 部门 ID
        
        Returns:
            是否移除成功
        """
        result = await db.execute(
            """
            DELETE FROM user_departments
            WHERE user_id = $1 AND department_id = $2
            """,
            user_id, department_id
        )
        
        return result is not None
    
    @staticmethod
    async def set_primary_department(
        user_id: str,
        department_id: str
    ) -> bool:
        """
        设置用户的主部门
        
        Args:
            user_id: 用户 ID
            department_id: 部门 ID
        
        Returns:
            是否设置成功
        """
        # 先取消所有主部门
        await db.execute(
            """
            UPDATE user_departments 
            SET is_primary = false 
            WHERE user_id = $1
            """,
            user_id
        )
        
        # 设置新的主部门
        await db.execute(
            """
            UPDATE user_departments 
            SET is_primary = true 
            WHERE user_id = $1 AND department_id = $2
            """,
            user_id, department_id
        )
        
        return True
