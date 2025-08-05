#!/bin/bash
# MCPHub 数据恢复脚本
# 使用方法: ./docker-restore.sh <backup_directory>

if [ -z "$1" ]; then
    echo "错误: 请指定备份目录"
    echo "使用方法: ./docker-restore.sh <backup_directory>"
    exit 1
fi

BACKUP_DIR="$1"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "错误: 备份目录不存在: $BACKUP_DIR"
    exit 1
fi

echo "正在从备份恢复 MCPHub 数据..."
echo "备份目录: $BACKUP_DIR"

# 停止服务
echo "正在停止服务..."
docker-compose down

echo "正在恢复 PostgreSQL 数据库..."
docker-compose up -d postgres
sleep 10
docker-compose exec -T postgres psql -U mcphub -d mcphub < "$BACKUP_DIR/mcphub_database.sql"

echo "正在恢复 Redis 数据..."
docker-compose up -d redis
sleep 5
docker cp "$BACKUP_DIR/redis_dump.rdb" "$(docker-compose ps -q redis):/tmp/dump.rdb"
docker-compose exec redis redis-cli --rdb /tmp/dump.rdb

echo "正在恢复配置文件..."
cp "$BACKUP_DIR/mcp_settings.json" ./
cp "$BACKUP_DIR/servers.json" ./

echo "正在恢复日志文件..."
cp -r "$BACKUP_DIR/access_logs" ./
cp -r "$BACKUP_DIR/mcp_usage_logs" ./

echo "正在恢复应用数据..."
if [ -f "$BACKUP_DIR/app_data.tar.gz" ]; then
    docker run --rm -v mcphub_app_data:/data -v "$PWD/$BACKUP_DIR":/backup ubuntu tar xzf /backup/app_data.tar.gz -C /data
fi

echo "正在重新启动所有服务..."
docker-compose up -d

echo "恢复完成!"