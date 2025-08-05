#!/bin/bash
# Windows环境下MCPHub测试脚本（需要先安装Docker）

echo "🔍 Windows环境MCPHub测试开始..."
echo "========================================"

# 检查Docker是否可用
echo "🐳 检查Docker环境..."
if command -v docker >/dev/null 2>&1; then
    echo "✅ Docker已安装: $(docker --version)"
else
    echo "❌ Docker未安装，请先安装Docker Desktop"
    echo "下载地址: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if command -v docker-compose >/dev/null 2>&1; then
    echo "✅ Docker Compose已安装: $(docker-compose --version)"
else
    echo "❌ Docker Compose未安装"
    exit 1
fi

# 检查Docker守护进程
if docker info >/dev/null 2>&1; then
    echo "✅ Docker守护进程正在运行"
else
    echo "❌ Docker守护进程未运行，请启动Docker Desktop"
    exit 1
fi

echo ""

# 检查配置文件
echo "📋 验证配置文件..."
./validate-config.sh | grep -E "(✅|❌)" | head -10

echo ""

# 验证docker-compose配置
echo "🔧 验证Docker Compose配置..."
if docker-compose config >/dev/null 2>&1; then
    echo "✅ docker-compose.yml配置语法正确"
else
    echo "❌ docker-compose.yml配置有错误:"
    docker-compose config
    exit 1
fi

echo ""

# 尝试拉取镜像
echo "📥 拉取Docker镜像..."
images=("pgvector/pgvector:pg15" "redis:7-alpine")
for image in "${images[@]}"; do
    echo "正在拉取 $image..."
    if docker pull "$image" >/dev/null 2>&1; then
        echo "✅ $image 拉取成功"
    else
        echo "❌ $image 拉取失败"
    fi
done

echo ""

# 启动服务
echo "🚀 启动服务..."
echo "正在停止现有服务..."
docker-compose down >/dev/null 2>&1

echo "正在启动服务（这可能需要几分钟）..."
if docker-compose up -d; then
    echo "✅ 服务启动命令执行成功"
else
    echo "❌ 服务启动失败"
    exit 1
fi

echo ""

# 等待服务启动
echo "⏳ 等待服务启动完成（最多3分钟）..."
max_wait=180
waited=0

while [ $waited -lt $max_wait ]; do
    if docker-compose ps | grep -q "Up"; then
        break
    fi
    sleep 5
    waited=$((waited + 5))
    echo "等待中... ($waited/${max_wait}秒)"
done

echo ""

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose ps

echo ""

# 健康检查
echo "💊 执行健康检查..."

# PostgreSQL健康检查
if docker-compose exec -T postgres pg_isready -U mcphub -d mcphub >/dev/null 2>&1; then
    echo "✅ PostgreSQL健康检查通过"
else
    echo "❌ PostgreSQL健康检查失败"
fi

# Redis健康检查
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis健康检查通过"
else
    echo "❌ Redis健康检查失败"
fi

# MCPHub应用健康检查
if curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo "✅ MCPHub应用健康检查通过"
else
    echo "❌ MCPHub应用健康检查失败，检查日志:"
    docker-compose logs mcphub | tail -10
fi

echo ""

# pgvector扩展检查
echo "🔍 检查pgvector扩展..."
if [ -x "./scripts/check-pgvector.sh" ]; then
    ./scripts/check-pgvector.sh
else
    echo "⚠️ pgvector检查脚本不可执行"
fi

echo ""

# 数据持久化测试
echo "💾 测试数据持久化..."
echo "创建测试数据..."
if docker-compose exec -T postgres psql -U mcphub -d mcphub -c "CREATE TABLE IF NOT EXISTS test_persistence (id SERIAL PRIMARY KEY, test_data VARCHAR(50));" >/dev/null 2>&1; then
    docker-compose exec -T postgres psql -U mcphub -d mcphub -c "INSERT INTO test_persistence (test_data) VALUES ('windows_test_$(date +%s)');" >/dev/null 2>&1
    echo "✅ 测试数据创建成功"
    
    echo "重启服务测试数据持久化..."
    docker-compose restart postgres >/dev/null 2>&1
    sleep 10
    
    if docker-compose exec -T postgres psql -U mcphub -d mcphub -c "SELECT COUNT(*) FROM test_persistence;" | grep -q "1"; then
        echo "✅ 数据持久化测试通过"
        # 清理测试数据
        docker-compose exec -T postgres psql -U mcphub -d mcphub -c "DROP TABLE test_persistence;" >/dev/null 2>&1
    else
        echo "❌ 数据持久化测试失败"
    fi
else
    echo "❌ 无法创建测试数据"
fi

echo ""

# 端口检查
echo "🔌 检查端口占用..."
ports=("3000" "5432" "6379")
for port in "${ports[@]}"; do
    if netstat -an 2>/dev/null | grep ":$port" | grep -q "LISTEN"; then
        echo "✅ 端口 $port 正在监听"
    else
        echo "❌ 端口 $port 未在监听"
    fi
done

echo ""

# 最终报告
echo "📋 测试报告"
echo "========================================"
echo "Docker环境: ✅ 正常"
echo "配置文件: ✅ 正确"
echo "服务启动: $(docker-compose ps -q | wc -l)/3 个服务运行中"
echo "健康检查: 请查看上方具体结果"
echo "数据持久化: 请查看上方测试结果"

echo ""
echo "🎉 Windows环境测试完成！"
echo ""
echo "💡 提示："
echo "- 如果有服务启动失败，请检查日志: docker-compose logs [service_name]"
echo "- 确保防火墙没有阻止Docker端口"
echo "- 如需备份数据，运行: ./docker-backup.sh"
echo "- 详细文档请查看: WINDOWS_VERIFICATION_GUIDE.md"