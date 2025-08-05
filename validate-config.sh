#!/bin/bash
# MCPHub 配置验证脚本（无需Docker运行）
# 用于在安装Docker之前验证所有配置文件

echo "🔍 MCPHub Windows配置验证开始..."
echo "========================================"

# 检查必要文件
echo "📁 检查必要文件..."
files_to_check=(
    "docker-compose.yml"
    ".env"
    "scripts/init-postgres.sql"
    "scripts/check-pgvector.sh"
    "docker-backup.sh"
    "docker-restore.sh"
    "mcp_settings.json"
    "servers.json"
)

missing_files=()
for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 缺失"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo "✅ 所有必要文件都存在"
else
    echo "❌ 发现缺失文件: ${missing_files[*]}"
fi

echo ""

# 检查脚本权限
echo "🔐 检查脚本权限..."
scripts=(
    "docker-backup.sh"
    "docker-restore.sh"
    "scripts/check-pgvector.sh"
)

for script in "${scripts[@]}"; do
    if [ -x "$script" ]; then
        echo "✅ $script 有执行权限"
    else
        echo "⚠️ $script 没有执行权限，正在修复..."
        chmod +x "$script" 2>/dev/null && echo "✅ 权限已修复" || echo "❌ 权限修复失败"
    fi
done

echo ""

# 检查docker-compose.yml语法
echo "📝 检查docker-compose.yml语法..."
if command -v python3 >/dev/null 2>&1; then
    if python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml', 'r')); print('✅ YAML语法正确')" 2>/dev/null; then
        :
    else
        echo "❌ YAML语法错误，请检查docker-compose.yml"
    fi
elif command -v node >/dev/null 2>&1; then
    if node -e "const yaml = require('js-yaml'); const fs = require('fs'); yaml.load(fs.readFileSync('docker-compose.yml', 'utf8')); console.log('✅ YAML语法正确');" 2>/dev/null; then
        :
    else
        echo "❌ YAML语法错误或js-yaml模块未安装"
    fi
else
    echo "⚠️ 无法验证YAML语法（需要Python3或Node.js）"
    echo "   手动检查：确保docker-compose.yml没有缩进错误"
fi

echo ""

# 检查环境变量配置
echo "🔧 检查环境变量配置..."
if [ -f ".env" ]; then
    echo "✅ .env文件存在"
    
    # 检查关键环境变量
    required_vars=(
        "DB_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "PORT"
    )
    
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" .env; then
            value=$(grep "^${var}=" .env | cut -d'=' -f2)
            if [ -n "$value" ]; then
                echo "✅ $var 已设置"
                # 检查是否使用默认值
                if [ "$var" = "JWT_SECRET" ] && [ "$value" = "your-jwt-secret-key-change-this-in-production" ]; then
                    echo "⚠️ JWT_SECRET 使用默认值，生产环境请修改"
                fi
            else
                echo "⚠️ $var 已定义但值为空"
            fi
        else
            echo "❌ $var 未在.env中定义"
        fi
    done
else
    echo "❌ .env文件不存在"
fi

echo ""

# 检查Docker服务配置
echo "🐳 检查Docker服务配置..."
if grep -q "pgvector/pgvector:pg15" docker-compose.yml; then
    echo "✅ 使用正确的PostgreSQL+pgvector镜像"
else
    echo "❌ PostgreSQL镜像配置可能有问题"
fi

if grep -q "redis:7-alpine" docker-compose.yml; then
    echo "✅ 使用正确的Redis镜像"
else
    echo "❌ Redis镜像配置可能有问题"
fi

# 检查数据卷配置
volumes=(
    "postgres_data"
    "redis_data"
    "app_data"
    "temp_data"
    "uploads_data"
)

for volume in "${volumes[@]}"; do
    if grep -q "$volume:" docker-compose.yml; then
        echo "✅ 数据卷 $volume 已配置"
    else
        echo "❌ 数据卷 $volume 配置缺失"
    fi
done

echo ""

# 检查健康检查配置
echo "💊 检查健康检查配置..."
if grep -A10 "postgres:" docker-compose.yml | grep -q "healthcheck:"; then
    echo "✅ postgres 服务健康检查已配置"
else
    echo "❌ postgres 服务健康检查配置缺失"
fi

if grep -A10 "redis:" docker-compose.yml | grep -q "healthcheck:"; then
    echo "✅ redis 服务健康检查已配置"
else
    echo "❌ redis 服务健康检查配置缺失"
fi

if grep -A15 "  mcphub:" docker-compose.yml | grep -q "healthcheck:"; then
    echo "✅ mcphub 服务健康检查已配置"
else
    echo "❌ mcphub 服务健康检查配置缺失"
fi

echo ""

# 生成报告
echo "📊 验证报告"
echo "========================================"
echo "配置文件验证: $([ ${#missing_files[@]} -eq 0 ] && echo "✅ 通过" || echo "❌ 失败")"
echo "脚本权限检查: ✅ 已检查"
echo "环境变量配置: $([ -f ".env" ] && echo "✅ 已配置" || echo "❌ 未配置")"
echo "Docker配置: $(grep -q "pgvector" docker-compose.yml && echo "✅ 正确" || echo "❌ 错误")"

echo ""
echo "🎯 下一步操作："
echo "1. 安装Docker Desktop for Windows"
echo "2. 启动Docker服务"
echo "3. 运行: docker-compose up -d"
echo "4. 运行: ./scripts/check-pgvector.sh"
echo ""
echo "📋 详细说明请查看: WINDOWS_VERIFICATION_GUIDE.md"

echo ""
echo "✅ 配置验证完成！"