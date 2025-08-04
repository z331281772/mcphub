#!/bin/bash

# MCP Hub Docker 停止脚本

set -e

echo "🛑 MCP Hub Docker 停止脚本"

# 检查Docker环境并选择compose命令
if command -v docker-compose >/dev/null; then
    COMPOSE="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
else
    echo "❌ Docker Compose 未安装"
    exit 1
fi

# 参数解析
REMOVE_VOLUMES=false
REMOVE_IMAGES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --remove-volumes|-v)
            REMOVE_VOLUMES=true
            shift
            ;;
        --remove-images|-i)
            REMOVE_IMAGES=true
            shift
            ;;
        -h|--help)
            echo "用法: $0 [选项]"
            echo "选项:"
            echo "  --remove-volumes,-v  删除所有数据卷（⚠️ 数据将丢失）"
            echo "  --remove-images,-i   删除构建的镜像"
            echo "  -h, --help           显示帮助"
            exit 0
            ;;
        *)
            echo "❌ 未知参数: $1，使用 --help 查看帮助"
            exit 1
            ;;
    esac
done

# 显示当前状态
echo "📊 当前服务状态:"
$COMPOSE ps 2>/dev/null || echo "   无服务运行"

# 构建停止命令
STOP_CMD="$COMPOSE down"

if [ "$REMOVE_VOLUMES" = true ]; then
    echo "⚠️  警告: 即将删除所有数据卷，包括数据库数据！"
    read -p "确定继续？(输入 'yes' 确认): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ 操作取消"
        exit 1
    fi
    STOP_CMD="$STOP_CMD -v"
fi

# 停止服务
echo "🛑 停止服务..."
$STOP_CMD

# 删除镜像
if [ "$REMOVE_IMAGES" = true ]; then
    echo "🗑️  删除镜像..."
    
    # 获取项目名称并删除相关镜像
    PROJECT_NAME=$($COMPOSE config --project-name 2>/dev/null || echo "mcphub")
    docker rmi "${PROJECT_NAME}_mcphub" "${PROJECT_NAME}-mcphub" 2>/dev/null || true
    
    # 清理悬挂镜像
    docker image prune -f >/dev/null 2>&1 || true
fi

echo "✅ 服务已停止"

# 显示剩余资源
REMAINING_CONTAINERS=$(docker ps -a --filter "name=mcphub" -q | wc -l)
REMAINING_VOLUMES=$(docker volume ls --filter "name=mcphub" -q | wc -l)

if [ "$REMAINING_CONTAINERS" -gt 0 ] || [ "$REMAINING_VOLUMES" -gt 0 ]; then
    echo ""
    echo "💡 剩余资源:"
    [ "$REMAINING_CONTAINERS" -gt 0 ] && echo "  容器: $REMAINING_CONTAINERS 个"
    [ "$REMAINING_VOLUMES" -gt 0 ] && echo "  数据卷: $REMAINING_VOLUMES 个"
    echo ""
    echo "完全清理: $0 --remove-volumes --remove-images"
fi