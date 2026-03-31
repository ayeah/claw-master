#!/usr/bin/env python3
"""
数据库连接检查脚本
"""

import asyncio
import asyncpg
import os
from pathlib import Path

# 添加项目根目录到路径
import sys
sys.path.insert(0, str(Path(__file__).parent))

from config.database import get_dsn, DB_CONFIG


async def check_database():
    """检查数据库连接和表"""
    
    print("=" * 70)
    print("  🔍 OpenClaw 数据库连接检查")
    print("=" * 70)
    print()
    
    # 显示数据库配置
    print("📋 数据库配置:")
    print(f"  主机：{DB_CONFIG['host']}")
    print(f"  端口：{DB_CONFIG['port']}")
    print(f"  数据库：{DB_CONFIG['database']}")
    print(f"  用户：{DB_CONFIG['user']}")
    print()
    
    conn = None
    try:
        # 1. 尝试连接数据库
        print("🔌 正在连接数据库...")
        dsn = get_dsn()
        conn = await asyncpg.connect(dsn)
        print("✅ 数据库连接成功！")
        print()
        
        # 2. 获取数据库版本
        print("📊 数据库信息:")
        version = await conn.fetchval("SELECT version()")
        print(f"  PostgreSQL 版本：{version[:50]}...")
        
        # 获取当前数据库
        current_db = await conn.fetchval("SELECT current_database()")
        print(f"  当前数据库：{current_db}")
        
        # 获取当前用户
        current_user = await conn.fetchval("SELECT current_user")
        print(f"  当前用户：{current_user}")
        print()
        
        # 3. 列出所有表
        print("📋 数据库表列表:")
        print("-" * 70)
        
        tables = await conn.fetch("""
            SELECT 
                table_schema,
                table_name,
                table_type
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY table_schema, table_name
        """)
        
        if not tables:
            print("  ⚠️  未找到用户表")
        else:
            print(f"  找到 {len(tables)} 个表:\n")
            
            for table in tables:
                schema = table['table_schema']
                name = table['table_name']
                type = table['table_type']
                
                # 获取表注释
                comment = await conn.fetchval("""
                    SELECT obj_description(
                        (quote_ident($1) || '.' || quote_ident($2))::regclass::oid
                    )
                """, schema, name)
                
                comment_text = f" - {comment}" if comment else ""
                print(f"  • {schema}.{name} ({type}){comment_text}")
        
        print()
        print("-" * 70)
        
        # 4. 检查 claw-master 数据库的表
        print()
        print("📦 claw-master 数据库表详情:")
        print("-" * 70)
        
        # 查询每个表的行数
        for table in tables:
            schema = table['table_schema']
            name = table['table_name']
            
            try:
                row_count = await conn.fetchval(f'SELECT COUNT(*) FROM {schema}.{name}')
                
                # 获取列信息
                columns = await conn.fetch("""
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_schema = $1 AND table_name = $2
                    ORDER BY ordinal_position
                """, schema, name)
                
                print(f"\n  📊 {schema}.{name} ({row_count} 行)")
                print(f"     列: {len(columns)}")
                
                for col in columns[:5]:  # 只显示前 5 列
                    nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                    default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
                    print(f"       - {col['column_name']}: {col['data_type']} ({nullable}{default})")
                
                if len(columns) > 5:
                    print(f"       ... 还有 {len(columns) - 5} 列")
                
            except Exception as e:
                print(f"\n  ⚠️  {schema}.{name}: 无法查询 ({e})")
        
        print()
        print("-" * 70)
        
        # 5. 检查是否有初始化脚本需要执行
        print()
        init_script = Path(__file__).parent.parent / 'database' / 'init.sql'
        if init_script.exists():
            print(f"📝 数据库初始化脚本：{init_script}")
            print(f"   状态：存在")
        else:
            print(f"⚠️  数据库初始化脚本未找到")
        
        print()
        print("=" * 70)
        print("  ✅ 数据库检查完成")
        print("=" * 70)
        
    except asyncpg.exceptions.InvalidPasswordError as e:
        print(f"❌ 密码错误：{e}")
        print()
        print("请检查数据库密码是否正确配置。")
    except asyncpg.exceptions.InvalidCatalogNameError as e:
        print(f"❌ 数据库不存在：{e}")
        print()
        print("请先创建数据库或运行初始化脚本。")
    except OSError as e:
        print(f"❌ 网络连接错误：{e}")
        print()
        print("请检查数据库服务器是否可访问。")
    except Exception as e:
        print(f"❌ 错误：{e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            await conn.close()


if __name__ == '__main__':
    asyncio.run(check_database())
