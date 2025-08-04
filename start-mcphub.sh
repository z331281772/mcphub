#!/bin/bash
# MCPHub 快速启动脚本 - 适配新目录结构

set -e

echo "🚀 MCPHub 启动脚本"
echo "=================="

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 显示可用选项
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  dev     启动开发环境"
    echo "  prod    启动生产环境 (Docker)"
    echo "  setup   首次安装和设置"
    echo "  check   验证配置"
    echo "  clean   清理和重置"
    echo ""
    exit 0
fi

case "$1" in
    "dev")
        echo "🔧 启动开发环境..."
        ./scripts/dev/start.sh
        ;;
    "prod")
        echo "🐳 启动生产环境 (Docker)..."
        cd docker
        docker-compose up -d
        cd ..
        echo "✅ 服务启动成功!"
        echo "🌐 访问: http://localhost:3000"
        ;;
    "setup")
        echo "⚙️ 开始安装和设置..."
        ./scripts/setup/install.sh
        ;;
    "check")
        echo "✅ 验证配置..."
        ./scripts/validation/validate-config.sh
        ;;
    "clean")
        echo "🧹 清理环境..."
        cd docker
        docker-compose down -v
        cd ..
        echo "✅ 清理完成"
        ;;
    *)
        echo "请选择启动方式:"
        echo "1) dev  - 开发环境"
        echo "2) prod - 生产环境 (Docker)"
        echo "3) setup - 首次安装"
        echo "4) check - 验证配置"
        echo "5) clean - 清理环境"
        echo ""
        read -p "请输入选择 (1-5): " choice
        
        case $choice in
            1) $0 dev ;;
            2) $0 prod ;;
            3) $0 setup ;;
            4) $0 check ;;
            5) $0 clean ;;
            *) echo "❌ 无效选择" ;;
        esac
        ;;
esac