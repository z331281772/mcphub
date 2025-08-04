#!/bin/bash
# 检查 pgvector 扩展是否可用的脚本

echo "Checking if pgvector extension is available..."

# 尝试在 postgres 容器中检查扩展
if docker-compose exec postgres psql -U mcphub -d mcphub -c "SELECT extname FROM pg_extension WHERE extname = 'vector';" 2>/dev/null | grep -q "vector"; then
    echo "✓ pgvector extension is installed and available"
else
    echo "⚠ pgvector extension is not available"
    echo "This may cause vector search features to not work properly."
    echo "Consider using a PostgreSQL image with pgvector pre-installed:"
    echo "  - pgvector/pgvector:pg15"
    echo "  - ankane/pgvector:latest"
fi

# 检查是否可以创建向量类型
if docker-compose exec postgres psql -U mcphub -d mcphub -c "SELECT typname FROM pg_type WHERE typname = 'vector';" 2>/dev/null | grep -q "vector"; then
    echo "✓ Vector type is available"
else
    echo "⚠ Vector type is not available - vector functionality will be limited"
fi