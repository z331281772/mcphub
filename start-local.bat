@echo off
echo 正在启动 MCPHub 本地 Docker 环境...
docker-compose build
docker-compose up -d
echo 服务已启动，访问 http://localhost:3000
pause
