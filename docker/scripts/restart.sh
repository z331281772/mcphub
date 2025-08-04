#!/bin/bash
# Docker 重启脚本

echo "🔄 重启 MCPHub Docker 服务..."

# 停止服务
echo "⏹️ 停止服务..."
docker-compose down

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

echo "✅ 重启完成!"
echo "📊 服务状态:"
docker-compose ps