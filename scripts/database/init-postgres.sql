-- PostgreSQL 初始化脚本
-- 创建必要的扩展以支持 MCPHub 功能

-- 创建 UUID 扩展（如果不存在）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建向量扩展（如果不存在）
-- 注意：需要 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建其他可能需要的扩展
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 用于文本搜索
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- 用于复合索引

-- 设置默认搜索路径
ALTER DATABASE mcphub SET search_path TO public;

-- 创建数据库用户权限（如果需要额外用户）
-- GRANT ALL PRIVILEGES ON DATABASE mcphub TO mcphub;

-- 输出初始化完成信息
SELECT 'PostgreSQL database initialized successfully for MCPHub' AS status;