#!/bin/bash

# MCP Hub Docker Compose 健康检查脚本

set -e

echo "=========================================="
echo "      MCP Hub 健康检查"
echo "=========================================="

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose 未安装"
    exit 1
fi

# 检查服务状态
echo "📊 检查服务状态..."
if ! docker-compose ps >/dev/null 2>&1; then
    echo "❌ 无法获取服务状态，请确保在项目目录中运行此脚本"
    exit 1
fi

services=$(docker-compose ps --services)
if [ -z "$services" ]; then
    echo "❌ 没有找到任何服务配置"
    exit 1
fi

echo "🔍 检查各个服务..."

# 检查各个服务的健康状态
overall_status=0

# PostgreSQL 健康检查
echo -n "  PostgreSQL: "
if docker-compose exec -T postgres pg_isready -U mcphub -d mcphub >/dev/null 2>&1; then
    echo "✅ 健康"
else
    echo "❌ 不健康"
    overall_status=1
fi

# Redis 健康检查
echo -n "  Redis: "
if docker-compose exec -T redis redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q "PONG"; then
    echo "✅ 健康"
else
    # 尝试不用密码
    if docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo "✅ 健康"
    else
        echo "❌ 不健康"
        overall_status=1
    fi
fi

# MCP Hub 应用健康检查
echo -n "  MCP Hub App: "
if curl -f -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "✅ 健康"
elif curl -f -s http://localhost:3000/ >/dev/null 2>&1; then
    echo "✅ 健康 (主页可访问)"
else
    echo "❌ 不健康"
    overall_status=1
fi

# Nginx 健康检查（如果启用）
if docker-compose ps nginx >/dev/null 2>&1 && [ "$(docker-compose ps -q nginx)" ]; then
    echo -n "  Nginx: "
    if curl -f -s http://localhost/ >/dev/null 2>&1; then
        echo "✅ 健康"
    else
        echo "❌ 不健康"
        overall_status=1
    fi
fi

echo ""

# 显示服务详细状态
echo "📋 详细服务状态:"
docker-compose ps

echo ""

# 显示资源使用情况
echo "💾 资源使用情况:"
echo "容器资源使用:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" $(docker-compose ps -q) 2>/dev/null || echo "无法获取资源使用信息"

echo ""

# 显示数据卷使用情况
echo "📦 数据卷使用情况:"
if docker volume ls --filter name=mcphub --format "table {{.Name}}\t{{.Driver}}" | grep -v "VOLUME NAME" | grep -q .; then
    docker volume ls --filter name=mcphub --format "table {{.Name}}\t{{.Driver}}"
    echo ""
    echo "数据卷大小:"
    for volume in $(docker volume ls --filter name=mcphub --format "{{.Name}}"); do
        size=$(docker run --rm -v "$volume":/data alpine du -sh /data 2>/dev/null | cut -f1 || echo "未知")
        echo "  $volume: $size"
    done
else
    echo "  没有找到相关数据卷"
fi

echo ""

# 显示日志摘要
echo "📝 最近日志摘要:"
echo "最近 5 分钟的错误日志:"
docker-compose logs --since=5m 2>/dev/null | grep -i error | tail -5 || echo "  没有发现错误日志"

echo ""

# 显示网络连接状态
echo "🌐 网络连接测试:"
echo -n "  内部网络连接: "
if docker-compose exec -T mcphub-app ping -c 1 postgres >/dev/null 2>&1; then
    echo "✅ 正常"
else
    echo "❌ 异常"
    overall_status=1
fi

echo -n "  外部网络连接: "
if docker-compose exec -T mcphub-app ping -c 1 8.8.8.8 >/dev/null 2>&1; then
    echo "✅ 正常"
else
    echo "❌ 异常"
    overall_status=1
fi

echo ""

# 总体状态
if [ $overall_status -eq 0 ]; then
    echo "🎉 总体状态: 所有服务运行正常"
    echo ""
    echo "🌐 访问地址:"
    echo "   - Web UI: http://localhost:3000"
    if docker-compose ps nginx >/dev/null 2>&1 && [ "$(docker-compose ps -q nginx)" ]; then
        echo "   - Nginx:  http://localhost"
    fi
else
    echo "⚠️  总体状态: 某些服务存在问题，请检查上述详情"
    echo ""
    echo "🔧 建议操作:"
    echo "   查看日志: docker-compose logs -f"
    echo "   重启服务: docker-compose restart"
    echo "   获取帮助: 查看 DOCKER_DEPLOYMENT.md"
fi

exit $overall_status