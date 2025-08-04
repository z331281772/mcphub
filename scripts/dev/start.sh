#!/bin/bash

# Linux环境下MCPHub Docker启动脚本

set -e

echo "��� 开始启动MCPHub服务..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 创建必要的目录
mkdir -p data logs

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "⚠️  未找到.env文件，正在从模板创建..."
    cp env.example .env
    echo "✅ 已创建.env文件，请根据需要修改配置"
fi

# 检查配置文件
if [ ! -f mcp_settings.json ]; then
    echo "⚠️  未找到mcp_settings.json，创建默认配置..."
    cat > mcp_settings.json << 'JSONEOF'
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/app/data"]
    },
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  }
}
JSONEOF
fi

if [ ! -f servers.json ]; then
    echo "⚠️  未找到servers.json，创建默认配置..."
    cat > servers.json << 'JSONEOF'
{
  "servers": [
    {
      "name": "filesystem",
      "description": "文件系统访问",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"]
    },
    {
      "name": "fetch",
      "description": "HTTP请求工具",
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  ]
}
JSONEOF
fi

# 构建并启动服务
echo "��� 正在构建Docker镜像..."
docker-compose build

echo "��� 正在启动服务..."
docker-compose up -d

echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
if docker-compose ps | grep -q "Up"; then
    echo "✅ 服务启动成功！"
    echo ""
    echo "��� 访问地址："
    echo "   - Web界面: http://localhost:3000"
    echo "   - PostgreSQL: localhost:5432"
    echo "   - Redis: localhost:6379"
    echo ""
    echo "��� 查看日志："
    echo "   docker-compose logs -f"
    echo ""
    echo "��� 停止服务："
    echo "   docker-compose down"
else
    echo "❌ 服务启动失败，请查看日志："
    docker-compose logs
    exit 1
fi
