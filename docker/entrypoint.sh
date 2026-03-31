#!/bin/bash
set -e

echo "========================================"
echo "  🚀 claw-master 管理系统启动"
echo "========================================"

# 创建必要目录
mkdir -p /app/logs /app/data /app/config

# 设置日志目录权限
chown -R www-data:www-data /app/logs
chmod -R 755 /app/logs

# 检查数据库连接
echo ""
echo "📡 检查数据库连接..."
if [ -n "$DATABASE_URL" ]; then
    echo "  ✅ 数据库配置：已设置"
else
    echo "  ⚠️  数据库配置：未设置 DATABASE_URL"
    echo "  请确保设置了 DATABASE_URL 环境变量"
fi

# 启动 Nginx
echo ""
echo "🌐 启动 Nginx..."
nginx -t
nginx
echo "  ✅ Nginx 已启动 (端口 80)"

# 启动 Python 后端
echo ""
echo "🐍 启动 Python 后端..."
cd /app/backend
exec python3 main.py --port 8000 --host 127.0.0.1
