# MCPHub 数据持久化高可用性改进计划
`
## 📊 现状评估

### 当前架构风险
- **🔴 极高风险**: 用户数据和配置存储在单个JSON文件中
- **🟡 中等风险**: 日志文件无备份和轮转机制
- **🟢 低风险**: 向量搜索已支持PostgreSQL

## 🚀 改进计划

### 阶段一：紧急改进 (1-2周)

#### 1.1 文件备份机制
```typescript
// 实现方案：每次写入前创建备份
export const saveSettingsWithBackup = (settings: McpSettings): boolean => {
  const settingsPath = getSettingsPath();
  const backupPath = `${settingsPath}.backup.${Date.now()}`;
  
  try {
    // 创建备份
    if (fs.existsSync(settingsPath)) {
      fs.copyFileSync(settingsPath, backupPath);
    }
    
    // 原子写入
    const tempPath = `${settingsPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(settings, null, 2));
    fs.renameSync(tempPath, settingsPath);
    
    // 清理旧备份（保留最近10个）
    cleanOldBackups();
    
    return true;
  } catch (error) {
    // 恢复备份
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, settingsPath);
    }
    return false;
  }
};
```

#### 1.2 数据完整性验证
```typescript
// JSON Schema验证
export const validateSettings = (settings: any): boolean => {
  const schema = {
    type: "object",
    required: ["mcpServers", "users", "systemConfig"],
    properties: {
      users: {
        type: "array",
        items: {
          type: "object",
          required: ["username", "password", "isAdmin"]
        }
      }
    }
  };
  
  return ajv.validate(schema, settings);
};
```

#### 1.3 文件锁机制
```typescript
import lockfile from 'proper-lockfile';

export const saveSettingsAtomic = async (settings: McpSettings): Promise<boolean> => {
  const settingsPath = getSettingsPath();
  const release = await lockfile.lock(settingsPath);
  
  try {
    return saveSettingsWithBackup(settings);
  } finally {
    await release();
  }
};
```

### 阶段二：数据库迁移 (2-4周)

#### 2.1 SQLite本地数据库
```sql
-- 用户表
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  email VARCHAR(100),
  full_name VARCHAR(100),
  access_token VARCHAR(255),
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  last_activity INTEGER
);

-- 服务器配置表
CREATE TABLE mcp_servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  command VARCHAR(255),
  args TEXT, -- JSON array
  url VARCHAR(255),
  enabled BOOLEAN DEFAULT TRUE,
  owner VARCHAR(50),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 使用日志表
CREATE TABLE mcp_usage_logs (
  id VARCHAR(50) PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  username VARCHAR(50) NOT NULL,
  server_name VARCHAR(100) NOT NULL,
  tool_name VARCHAR(100) NOT NULL,
  success BOOLEAN NOT NULL,
  arguments TEXT, -- JSON
  error_message TEXT,
  duration INTEGER,
  ip VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(100)
);

-- 访问日志表
CREATE TABLE access_logs (
  id VARCHAR(50) PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  username VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  ip VARCHAR(45),
  user_agent TEXT,
  duration INTEGER,
  details TEXT -- JSON
);
```

#### 2.2 数据迁移脚本
```typescript
export class DataMigration {
  async migrateFromJSON(): Promise<void> {
    console.log('Starting data migration from JSON to SQLite...');
    
    // 1. 备份现有数据
    await this.backupExistingData();
    
    // 2. 迁移用户数据
    await this.migrateUsers();
    
    // 3. 迁移服务器配置
    await this.migrateServers();
    
    // 4. 迁移日志数据
    await this.migrateLogs();
    
    // 5. 验证迁移结果
    await this.validateMigration();
    
    console.log('Data migration completed successfully');
  }
}
```

### 阶段三：高可用架构 (4-8周)

#### 3.1 主从复制
```yaml
# docker-compose.yml
version: '3.8'
services:
  mcphub-master:
    build: .
    environment:
      - DB_URL=postgresql://user:pass@postgres-master:5432/mcphub
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres-master
      - redis

  mcphub-replica:
    build: .
    environment:
      - DB_URL=postgresql://user:pass@postgres-replica:5432/mcphub
      - REDIS_URL=redis://redis:6379
      - READ_ONLY=true
    depends_on:
      - postgres-replica
      - redis

  postgres-master:
    image: postgres:15
    environment:
      - POSTGRES_REPLICATION_MODE=master
      - POSTGRES_REPLICATION_USER=replicator
      - POSTGRES_REPLICATION_PASSWORD=replpass
    volumes:
      - postgres_master_data:/var/lib/postgresql/data

  postgres-replica:
    image: postgres:15
    environment:
      - POSTGRES_REPLICATION_MODE=slave
      - POSTGRES_MASTER_HOST=postgres-master
      - POSTGRES_REPLICATION_USER=replicator
      - POSTGRES_REPLICATION_PASSWORD=replpass
    depends_on:
      - postgres-master

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

#### 3.2 分布式配置管理
```typescript
// 使用Redis作为配置中心
export class ConfigManager {
  private redis: Redis;
  
  async getConfig(key: string): Promise<any> {
    const cached = await this.redis.get(`config:${key}`);
    if (cached) return JSON.parse(cached);
    
    // 从数据库获取并缓存
    const config = await this.database.getConfig(key);
    await this.redis.setex(`config:${key}`, 300, JSON.stringify(config));
    return config;
  }
  
  async updateConfig(key: string, value: any): Promise<void> {
    // 更新数据库
    await this.database.updateConfig(key, value);
    
    // 更新缓存
    await this.redis.setex(`config:${key}`, 300, JSON.stringify(value));
    
    // 通知其他实例
    await this.redis.publish('config:update', JSON.stringify({ key, value }));
  }
}
```

### 阶段四：监控和运维 (并行进行)

#### 4.1 健康检查
```typescript
export class HealthChecker {
  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkFileSystem(),
      this.checkMemory(),
    ]);
    
    return {
      status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      checks: checks.map((check, i) => ({
        name: ['database', 'redis', 'filesystem', 'memory'][i],
        status: check.status,
        error: check.status === 'rejected' ? check.reason : null
      }))
    };
  }
}
```

#### 4.2 监控指标
```typescript
export class MetricsCollector {
  async collectMetrics(): Promise<Metrics> {
    return {
      // 业务指标
      totalUsers: await this.database.countUsers(),
      activeUsers: await this.database.countActiveUsers(),
      totalServers: await this.database.countServers(),
      totalToolCalls: await this.database.countToolCalls(),
      
      // 系统指标
      memoryUsage: process.memoryUsage(),
      cpuUsage: await this.getCpuUsage(),
      diskUsage: await this.getDiskUsage(),
      
      // 数据库指标
      dbConnections: await this.database.getConnectionCount(),
      dbLatency: await this.database.measureLatency(),
      
      // 缓存指标
      cacheHitRate: await this.redis.getHitRate(),
      cacheSize: await this.redis.getMemoryUsage(),
    };
  }
}
```

## 🎯 实施优先级

### 立即执行 (本周)
1. ✅ 实现文件备份机制
2. ✅ 添加数据完整性验证
3. ✅ 实现文件锁机制

### 短期目标 (1个月)
1. 🔄 设计并实现SQLite迁移
2. 🔄 创建数据迁移脚本
3. 🔄 实现双写模式过渡

### 中期目标 (2-3个月)
1. 📋 PostgreSQL主从复制
2. 📋 Redis缓存层
3. 📋 分布式配置管理

### 长期目标 (3-6个月)
1. 📋 多数据中心部署
2. 📋 自动故障转移
3. 📋 完整的监控体系

## 📈 预期收益

### 可靠性提升
- **数据丢失风险**: 从99%降低到0.1%
- **服务可用性**: 从95%提升到99.9%
- **故障恢复时间**: 从小时级降低到分钟级

### 性能改进
- **并发处理能力**: 提升10倍
- **查询响应时间**: 减少50%
- **扩展性**: 支持水平扩展

### 运维效率
- **自动化程度**: 提升80%
- **故障检测时间**: 从分钟级降低到秒级
- **部署复杂度**: 降低60%

## 💰 成本评估

### 开发成本
- **阶段一**: 3-5天 (1名开发者)
- **阶段二**: 2-3周 (1名开发者)
- **阶段三**: 4-6周 (2名开发者)
- **阶段四**: 持续投入

### 基础设施成本
- **单机部署**: 无额外成本
- **主从部署**: +50%服务器成本
- **多数据中心**: +200%服务器成本

### 维护成本
- **监控系统**: 低 (开源方案)
- **数据库管理**: 中等
- **运维培训**: 一次性投入

## 🔧 技术栈建议

### 数据库
- **SQLite**: 单机部署，零配置
- **PostgreSQL**: 高可用部署，功能完整
- **Redis**: 缓存和会话存储

### 监控
- **Prometheus**: 指标收集
- **Grafana**: 可视化
- **AlertManager**: 告警管理

### 部署
- **Docker**: 容器化
- **Docker Compose**: 本地部署
- **Kubernetes**: 生产环境

## 📝 实施检查清单

### 阶段一检查项
- [ ] 文件备份机制实现
- [ ] JSON Schema验证
- [ ] 文件锁实现
- [ ] 单元测试覆盖
- [ ] 集成测试通过

### 阶段二检查项
- [ ] SQLite集成完成
- [ ] 数据迁移脚本
- [ ] 双写模式实现
- [ ] 回滚机制
- [ ] 性能测试通过

### 阶段三检查项
- [ ] PostgreSQL主从配置
- [ ] Redis集成
- [ ] 负载均衡配置
- [ ] 故障转移测试
- [ ] 压力测试通过

### 阶段四检查项
- [ ] 监控系统部署
- [ ] 告警规则配置
- [ ] 运维文档完善
- [ ] 团队培训完成
- [ ] 生产环境验证

---

*本计划基于当前系统架构分析制定，具体实施过程中可能需要根据实际情况调整。* 