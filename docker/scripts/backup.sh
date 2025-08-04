#!/bin/bash
# MCPHub 数据备份脚本
# 使用方法: ./docker-backup.sh [backup_directory]

# 设置默认备份目录
BACKUP_DIR=${1:-"./backups/$(date +%Y%m%d_%H%M%S)"}

echo "正在创建备份目录: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

echo "正在备份 PostgreSQL 数据库..."
docker-compose exec -T postgres pg_dump -U mcphub -d mcphub > "$BACKUP_DIR/mcphub_database.sql"

echo "正在备份 Redis 数据..."
docker-compose exec -T redis redis-cli --rdb /tmp/dump.rdb
docker cp "$(docker-compose ps -q redis):/tmp/dump.rdb" "$BACKUP_DIR/redis_dump.rdb"

echo "正在备份配置文件..."
cp mcp_settings.json "$BACKUP_DIR/"
cp servers.json "$BACKUP_DIR/"
cp docker.env.example "$BACKUP_DIR/"

echo "正在备份日志文件..."
cp -r access_logs "$BACKUP_DIR/"
cp -r mcp_usage_logs "$BACKUP_DIR/"

echo "正在备份 Docker 数据卷..."
docker run --rm -v mcphub_app_data:/data -v "$PWD/$BACKUP_DIR":/backup ubuntu tar czf /backup/app_data.tar.gz -C /data .

echo "备份完成! 备份文件保存在: $BACKUP_DIR"
echo "要恢复备份，请使用: ./docker-restore.sh $BACKUP_DIR"