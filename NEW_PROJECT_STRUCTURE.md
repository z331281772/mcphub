# MCPHub 新项目结构说明

## 🎉 优化完成

项目结构已成功重组！所有文件已按功能分类到合理的目录中。

## 📁 新的目录结构

```
mcphub-origin/
│
├── 📦 package.json              # 项目依赖和脚本
├── 📖 README.md                 # 项目说明  
├── 🔧 tsconfig.json             # TypeScript配置
├── 🚀 start-mcphub.sh           # 🆕 统一启动脚本
│
├── 📁 src/                      # 后端源代码 (不变)
├── 📁 frontend/                 # 前端代码 (不变)
├── 📁 docs/                     # 项目文档 (不变)
├── 📁 tests/                    # 测试文件 (不变)
│
├── 🐳 docker/                   # 🆕 Docker相关文件
│   ├── Dockerfile               # 容器构建文件
│   ├── docker-compose.yml       # 服务编排配置
│   ├── .dockerignore            # Docker忽略文件
│   ├── entrypoint.sh            # 容器入口脚本
│   ├── 📁 scripts/              # Docker脚本
│   │   ├── start.sh             # 启动脚本
│   │   ├── stop.sh              # 停止脚本
│   │   ├── restart.sh           # 🆕 重启脚本
│   │   ├── backup.sh            # 备份脚本
│   │   ├── restore.sh           # 恢复脚本
│   │   └── health-check.sh      # 健康检查脚本
│   ├── 📁 config/               # Docker配置
│   │   └── .env.example         # 环境变量模板
│   └── 📁 volumes/              # 数据卷配置目录
│       ├── postgres/
│       ├── redis/
│       └── logs/
│
├── 📜 scripts/                  # 🔄 重新组织的脚本目录
│   ├── 📁 setup/                # 安装和设置脚本
│   │   ├── install.sh           # 安装脚本
│   │   └── fix-node-version.sh  # Node版本修复
│   ├── 📁 dev/                  # 开发工具脚本
│   │   ├── start.sh             # 开发启动
│   │   └── stop.sh              # 开发停止
│   ├── 📁 database/             # 数据库脚本
│   │   ├── init-postgres.sql    # PostgreSQL初始化
│   │   └── check-pgvector.sh    # pgvector检查
│   ├── 📁 validation/           # 验证脚本
│   │   ├── validate-config.sh   # 配置验证
│   │   └── test-environment.sh  # 环境测试
│   └── 📁 deployment/           # 部署脚本目录 (为未来扩展)
│
├── ⚙️ config/                   # 🆕 配置文件目录
│   ├── 📁 app/                  # 应用配置
│   │   ├── mcp_settings.json    # MCP服务器设置
│   │   └── servers.json         # 服务器列表
│   ├── 📁 environment/          # 环境配置
│   │   └── development.env.example # 开发环境变量
│   ├── 📁 database/             # 数据库配置目录
│   └── 📁 security/             # 安全配置目录
│       └── ssl/                 # SSL证书目录
│
└── 📊 logs/                     # 🆕 日志目录
    ├── access/                  # 访问日志
    ├── mcp_usage/              # MCP使用日志
    ├── application/            # 应用日志
    └── error/                  # 错误日志
```

## 🚀 快速使用指南

### 统一启动脚本
新增了 `start-mcphub.sh` 统一启动脚本：

```bash
# 查看帮助
./start-mcphub.sh --help

# 启动开发环境
./start-mcphub.sh dev

# 启动生产环境 (Docker)
./start-mcphub.sh prod

# 首次安装设置
./start-mcphub.sh setup

# 验证配置
./start-mcphub.sh check

# 清理环境
./start-mcphub.sh clean
```

### Docker 操作
```bash
# 进入docker目录
cd docker

# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
./scripts/restart.sh

# 备份数据
./scripts/backup.sh

# 恢复数据
./scripts/restore.sh [backup_directory]

# 健康检查
./scripts/health-check.sh
```

### 脚本分类使用
```bash
# 安装和设置
./scripts/setup/install.sh
./scripts/setup/fix-node-version.sh

# 开发工具
./scripts/dev/start.sh
./scripts/dev/stop.sh

# 数据库管理
./scripts/database/check-pgvector.sh

# 配置验证
./scripts/validation/validate-config.sh
./scripts/validation/test-environment.sh
```

## 📈 优化效果

### 目录组织对比
| 方面 | 优化前 | 优化后 |
|------|--------|--------|
| 根目录文件数 | 30+ | 10- |
| Docker文件 | 分散8个文件 | 集中在docker/目录 |
| 脚本组织 | 混乱14个脚本 | 按功能分类5个子目录 |
| 配置管理 | 分散各处 | 统一在config/目录 |
| 日志管理 | 2个散落目录 | 结构化logs/目录 |

### ✅ 主要改进
1. **🔍 查找便捷** - 相关文件集中，快速定位
2. **🛠️ 维护简单** - 按功能分类，职责清晰
3. **🔄 扩展友好** - 预留扩展目录，支持新功能
4. **👥 团队协作** - 目录职责明确，减少冲突
5. **📦 部署简化** - Docker文件集中，部署流程清晰

## 🔧 路径更新

### 主要变更
- `docker-compose.yml` → `docker/docker-compose.yml`
- `mcp_settings.json` → `config/app/mcp_settings.json`
- `servers.json` → `config/app/servers.json`
- `docker-*.sh` → `docker/scripts/*.sh`
- `access_logs/` → `logs/access/`
- `mcp_usage_logs/` → `logs/mcp_usage/`

### 路径引用已更新
✅ `docker/docker-compose.yml` - 容器构建路径和挂载路径  
✅ `scripts/validation/validate-config.sh` - 验证脚本路径  
✅ 所有脚本的可执行权限  

## ⚠️ 重要提醒

### 应用代码更新
如需在应用代码中引用配置文件，请更新路径：
```typescript
// 旧路径
const configPath = './mcp_settings.json';

// 新路径
const configPath = './config/app/mcp_settings.json';
```

### Git 忽略文件
建议更新 `.gitignore`：
```gitignore
# 日志文件
logs/**/*.log
logs/*/

# 环境配置
config/environment/.env.*
!config/environment/*.example

# Docker数据
docker/volumes/
```

## 🎯 未来扩展

### 预留目录
- `scripts/deployment/` - 部署自动化脚本
- `config/database/` - 数据库专用配置
- `config/security/` - 安全证书和密钥
- `logs/application/` - 应用日志
- `logs/error/` - 错误日志

### 建议增强
1. **监控脚本** - 添加性能监控和告警
2. **自动化测试** - 在validation目录增加测试脚本
3. **多环境支持** - 在config目录增加环境特定配置
4. **日志轮转** - 实现日志文件自动清理

## 🎉 总结

新的项目结构具有以下优势：
- ✅ **组织清晰** - 按功能分类，易于理解
- ✅ **维护便捷** - 相关文件集中，便于管理
- ✅ **扩展友好** - 预留目录，支持功能增长
- ✅ **团队协作** - 职责分明，减少冲突
- ✅ **部署简化** - Docker配置集中，流程清晰

项目现在更加专业和易于维护！🚀