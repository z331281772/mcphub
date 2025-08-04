#!/bin/bash

# 修复Node.js版本兼容性问题

echo "��� 修复Node.js版本兼容性问题..."

# 检查当前Node.js版本
CURRENT_NODE=$(node --version)
echo "当前Node.js版本: $CURRENT_NODE"

# 检查当前pnpm版本
CURRENT_PNPM=$(pnpm --version 2>/dev/null || echo "未安装")
echo "当前pnpm版本: $CURRENT_PNPM"

# 如果Node.js版本低于18，建议使用Docker
if [[ "$CURRENT_NODE" < "v18.0.0" ]]; then
    echo "⚠️  Node.js版本过低，建议使用Docker方式运行"
    echo "正在启动Docker环境..."
    ./start.sh
    exit 0
fi

# 降级pnpm到兼容版本
echo "��� 安装兼容的pnpm版本..."
npm install -g pnpm@8.15.6

# 验证安装
NEW_PNPM=$(pnpm --version)
echo "✅ 已安装pnpm版本: $NEW_PNPM"

# 清理缓存
echo "�� 清理缓存..."
pnpm store prune

# 重新安装依赖
echo "��� 重新安装依赖..."
pnpm install --no-frozen-lockfile

echo "✅ 修复完成！现在可以运行项目了"
echo "使用方法:"
echo "  开发模式: pnpm dev"
echo "  生产模式: pnpm build && pnpm start"
echo "  Docker模式: ./start.sh"
