#!/usr/bin/env python3
"""
数据库连接检查脚本（使用标准库）
"""

import socket
import http.client
import json
import os


def check_database():
    """检查数据库连接"""
    
    print("=" * 70)
    print("  🔍 OpenClaw 数据库连接检查")
    print("=" * 70)
    print()
    
    # 数据库配置
    db_host = os.getenv('DB_HOST', 'postgresql')
    db_port = os.getenv('DB_PORT', '5432')
    db_user = os.getenv('DB_USER', 'user_xKQftk')
    db_password = os.getenv('DB_PASSWORD', 'password_yP7FCG')
    db_name = os.getenv('DB_NAME', 'claw-master')
    
    print("📋 数据库配置:")
    print(f"  主机：{db_host}:{db_port}")
    print(f"  用户：{db_user}")
    print(f"  数据库：{db_name}")
    print()
    
    # 1. 检查 PostgreSQL 端口连通性
    print("🔌 检查数据库端口连接...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((db_host, int(db_port)))
        sock.close()
        
        if result == 0:
            print(f"✅ 数据库端口 {db_host}:{db_port} 可访问")
        else:
            print(f"❌ 数据库端口 {db_host}:{db_port} 无法访问 (错误码：{result})")
            return
    except Exception as e:
        print(f"❌ 连接检查失败：{e}")
        return
    
    print()
    print("=" * 70)
    print("  ✅ 数据库网络连通性正常")
    print("=" * 70)
    print()
    
    # 2. 使用 Docker 命令检查
    print("📦 尝试通过 Docker 检查数据库...")
    print()
    
    import subprocess
    
    try:
        # 使用 psql 连接数据库
        psql_cmd = f"""
        PGPASSWORD={db_password} psql -h {db_host} -p {db_port} -U {db_user} -d postgres -c "\\l" 2>&1
        """
        
        result = subprocess.run(
            psql_cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print("✅ 数据库连接成功！")
            print()
            print("📋 可用数据库列表:")
            print(result.stdout)
        else:
            print(f"⚠️  psql 命令执行失败:")
            print(result.stderr)
    
    except subprocess.TimeoutExpired:
        print("⚠️  命令执行超时")
    except Exception as e:
        print(f"⚠️  执行错误：{e}")
    
    print()
    print("=" * 70)


if __name__ == '__main__':
    check_database()
