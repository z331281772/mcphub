#!/bin/bash

# Linux环境下MCPHub Docker停止脚本

echo "��� 正在停止MCPHub服务..."

# 停止所有服务
docker-compose down

# 可选：清除所有数据卷（谨慎使用）
if [ "$1" = "--clean" ]; then
    echo "��� 正在清除所有数据..."
    docker-compose down -v
    docker system prune -f
    echo "✅ 数据已清除"
else
    echo "✅ 服务已停止"
    echo ""
    echo "��� 如需清除所有数据，请使用："
    echo "   ./stop.sh --clean"
fi
