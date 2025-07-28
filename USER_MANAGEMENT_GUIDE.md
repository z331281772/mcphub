# 用户管理和访问日志功能指南

本指南介绍MCP Hub项目中新增的用户管理和访问日志功能。

## 🚀 新增功能概览

### 1. 扩展的用户管理
- ✅ 用户状态管理（激活/禁用）
- ✅ 用户详细信息管理（邮箱、全名）
- ✅ 管理员用户管理界面
- ✅ 用户创建时间和活动时间跟踪
- ✅ **用户访问Token管理**

### 2. Token认证系统
- ✅ **用户访问Token生成和管理**
- ✅ **MCP服务器访问Token验证**
- ✅ **Bearer Token形式认证**
- ✅ **灵活的Token传递方式**
- ✅ **Token状态监控**

### 3. 访问日志系统
- ✅ 详细的API访问记录
- ✅ MCP服务器访问统计
- ✅ 工具调用跟踪
- ✅ 用户行为分析
- ✅ 系统使用概览

## 📋 API接口文档

### 用户管理接口

#### 获取所有用户（管理员）
```
GET /api/auth/users
Authorization: Bearer <token>
```

#### 获取所有用户及其Token（管理员）
```
GET /api/auth/users-with-tokens
Authorization: Bearer <token>
```

#### 更新用户信息（管理员）
```
PUT /api/auth/users/:username
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "user@example.com",
  "fullName": "用户全名",
  "isAdmin": false
}
```

#### 删除用户（管理员）
```
DELETE /api/auth/users/:username
Authorization: Bearer <token>
```

#### 更新用户状态（管理员）
```
PUT /api/auth/users/:username/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "active" | "disabled"
}
```

### 🔑 Token管理接口

#### 为用户生成访问Token（管理员）
```
POST /api/auth/users/:username/token
Authorization: Bearer <admin_token>
```

返回：
```json
{
  "success": true,
  "message": "Access token generated successfully",
  "token": "mcp_1234567890abcdef..."
}
```

#### 更新用户访问Token（管理员）
```
PUT /api/auth/users/:username/token
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "token": "mcp_customtoken123456"
}
```

#### 撤销用户访问Token（管理员）
```
DELETE /api/auth/users/:username/token
Authorization: Bearer <admin_token>
```

#### 验证访问Token
```
POST /api/auth/validate-token
Content-Type: application/json

{
  "token": "mcp_1234567890abcdef..."
}
```

返回：
```json
{
  "success": true,
  "valid": true,
  "username": "testuser",
  "user": {
    "username": "testuser",
    "isAdmin": false,
    "status": "active",
    "email": "test@example.com",
    "fullName": "测试用户"
  }
}
```

### 🔐 MCP服务器访问（Bearer Token形式）

所有MCP服务器访问现在都支持Bearer Token认证。支持以下几种方式：

#### 方式1：查询参数
```
GET /sse/myserver?token=mcp_1234567890abcdef...
GET /mcp/myserver?token=mcp_1234567890abcdef...
```

#### 方式2：Authorization Header（Bearer Token）
```
GET /sse/myserver
Authorization: Bearer mcp_1234567890abcdef...
```

#### 方式3：自定义Header
```
GET /sse/myserver
X-Access-Token: mcp_1234567890abcdef...
```

### 访问统计接口

#### 获取用户统计信息
```
GET /api/auth/users/:username/statistics
Authorization: Bearer <token>
```

返回数据结构：
```json
{
  "success": true,
  "data": {
    "username": "admin",
    "totalRequests": 150,
    "lastLoginAt": 1640995200000,
    "lastActivity": 1640995800000,
    "mostUsedServers": [
      { "serverName": "filesystem", "count": 45 },
      { "serverName": "database", "count": 30 }
    ],
    "mostUsedTools": [
      { "toolName": "read_file", "serverName": "filesystem", "count": 25 },
      { "toolName": "write_file", "serverName": "filesystem", "count": 20 }
    ],
    "dailyStats": [
      { "date": "2024-01-01", "requests": 50 },
      { "date": "2024-01-02", "requests": 65 }
    ]
  }
}
```

#### 获取所有用户统计概览（管理员）
```
GET /api/auth/users-statistics
Authorization: Bearer <token>
```

### 访问日志接口

#### 获取访问日志
```
GET /api/access-logs?limit=50&offset=0&username=admin&startDate=1640995200000&endDate=1640995800000
Authorization: Bearer <token>
```

参数说明：
- `limit`: 返回记录数限制（默认50）
- `offset`: 偏移量（默认0）
- `username`: 按用户名过滤（可选）
- `startDate`: 开始时间戳（可选）
- `endDate`: 结束时间戳（可选）

#### 获取系统概览（管理员）
```
GET /api/access-logs/overview
Authorization: Bearer <token>
```

#### 清理旧日志（管理员）
```
POST /api/access-logs/clean
Authorization: Bearer <token>
Content-Type: application/json

{
  "beforeTimestamp": 1640995200000
}
```

#### 导出访问日志（管理员）
```
GET /api/access-logs/export?username=admin&startDate=1640995200000&endDate=1640995800000
Authorization: Bearer <token>
```

## 🔧 数据模型

### 用户模型扩展
```typescript
interface IUser {
  username: string;
  password: string;
  isAdmin?: boolean;
  status?: 'active' | 'disabled';     // 新增：用户状态
  email?: string;                     // 新增：邮箱
  fullName?: string;                  // 新增：全名
  createdAt?: number;                 // 新增：创建时间
  lastLoginAt?: number;               // 新增：最后登录时间
  lastActivity?: number;              // 新增：最后活动时间
  accessToken?: string;               // 新增：用户访问Token
}
```

### Token验证结果模型
```typescript
interface ITokenValidation {
  valid: boolean;
  username?: string;
  user?: IUser;
  error?: string;
}
```

### 访问日志模型
```typescript
interface IAccessLog {
  id: string;                         // 唯一标识
  username: string;                   // 用户名
  action: string;                     // 操作类型
  resource: string;                   // 访问的资源
  method: string;                     // HTTP方法
  statusCode: number;                 // 响应状态码
  ip: string;                         // 客户端IP
  userAgent?: string;                 // 用户代理
  timestamp: number;                  // 时间戳
  duration?: number;                  // 请求耗时
  details?: any;                      // 额外详情
}
```

## 📊 记录的操作类型

系统会自动记录以下类型的用户操作：

### 认证操作
- `login` - 用户登录
- `register` - 用户注册
- `change_password` - 修改密码

### 用户管理操作
- `user_list` - 查看用户列表
- `user_update` - 更新用户信息
- `user_delete` - 删除用户
- `user_status_update` - 更新用户状态
- `user_statistics` - 查看用户统计

### Token管理操作
- `token_generate` - 生成访问Token
- `token_update` - 更新访问Token
- `token_revoke` - 撤销访问Token
- `token_validate` - 验证访问Token

### 服务器管理操作
- `server_list` - 查看服务器列表
- `server_create` - 创建服务器
- `server_update` - 更新服务器
- `server_delete` - 删除服务器
- `server_toggle` - 切换服务器状态
- `server_access` - 访问MCP服务器

### 工具操作
- `tool_call` - 调用工具
- `tool_toggle` - 切换工具状态

### 其他操作
- `group_list`, `group_create`, `group_update`, `group_delete` - 组管理
- `log_view`, `log_clear` - 日志管理
- `market_browse` - 浏览市场
- `sse_connection` - SSE连接

## 🔐 权限控制

### 管理员权限
- 查看所有用户
- 管理用户（创建、更新、删除、状态变更）
- **管理用户访问Token（生成、更新、撤销）**
- 查看所有用户的访问统计
- 查看系统概览
- 管理访问日志

### 普通用户权限
- 查看自己的访问统计
- 查看自己的访问日志
- 修改自己的密码
- **使用分配的Token访问MCP服务器**

## 📁 文件存储

### 用户数据
用户数据存储在 `mcp_settings.json` 文件中的 `users` 字段，包含访问Token。

### 访问日志
访问日志存储在 `access_logs/access_logs.json` 文件中，最多保存10,000条记录。

## 🚀 使用示例

### 1. 创建新用户并分配Token（管理员）
```bash
# 创建用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "email": "newuser@example.com",
    "fullName": "新用户",
    "isAdmin": false
  }'

# 为用户生成访问Token
curl -X POST http://localhost:3000/api/auth/users/newuser/token \
  -H "Authorization: Bearer <admin_token>"
```

### 2. 使用Bearer Token访问MCP服务器
```bash
# 方式1：查询参数
curl "http://localhost:3000/sse/myserver?token=mcp_1234567890abcdef..."

# 方式2：Authorization Header（Bearer Token）
curl -H "Authorization: Bearer mcp_1234567890abcdef..." \
     "http://localhost:3000/sse/myserver"

# 方式3：自定义Header
curl -H "X-Access-Token: mcp_1234567890abcdef..." \
     "http://localhost:3000/sse/myserver"
```

### 3. 验证Token有效性
```bash
curl -X POST http://localhost:3000/api/auth/validate-token \
  -H "Content-Type: application/json" \
  -d '{"token": "mcp_1234567890abcdef..."}'
```

### 4. 撤销用户Token（管理员）
```bash
curl -X DELETE http://localhost:3000/api/auth/users/newuser/token \
  -H "Authorization: Bearer <admin_token>"
```

### 5. 查看带Token的用户列表（管理员）
```bash
curl -X GET http://localhost:3000/api/auth/users-with-tokens \
  -H "Authorization: Bearer <admin_token>"
```

## 🔧 配置选项

### Token格式
- 默认格式：`mcp_` + 32位随机字符串
- 管理员可以自定义Token（必须唯一）

### 认证策略
服务器会自动应用以下认证策略：

```typescript
// API路由：需要JWT认证
// MCP/SSE路由：支持Token认证（可选，允许匿名但记录已认证用户）
```

### 日志保留策略
可以通过 `cleanOldLogs` API 定期清理旧日志：

```bash
# 清理30天前的日志
curl -X POST http://localhost:3000/api/access-logs/clean \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"beforeTimestamp": '$(date -d "30 days ago" +%s)'000'}'
```

### 环境变量
- `JWT_SECRET`: JWT签名密钥（生产环境必须设置）

## 🛠️ 故障排除

### 常见问题

1. **Token认证失败**
   - 检查Token是否正确传递（支持Bearer Token格式）
   - 验证Token是否有效且未过期
   - 确认用户状态为"active"

2. **权限不足错误**
   - 确保使用正确的管理员令牌
   - 检查用户是否有相应权限

3. **MCP服务器访问被拒绝**
   - 确认已提供有效的访问Token（Bearer格式）
   - 检查Token传递方式是否正确
   - 验证用户账户状态

4. **访问日志未记录**
   - 检查中间件是否正确配置
   - 确认Token认证成功

5. **用户状态问题**
   - 被禁用的用户无法登录或使用Token
   - 管理员无法禁用自己

## 🔒 安全建议

1. **Token管理**
   - 定期轮换Token
   - 撤销不再需要的Token
   - 监控Token使用情况

2. **访问监控**
   - 定期检查访问日志
   - 监控异常访问模式
   - 及时响应安全事件

3. **用户管理**
   - 定期审核用户权限
   - 及时禁用不活跃用户
   - 强制使用强密码

## 📝 更新日志

### v1.2.0
- ✅ 添加用户访问Token管理
- ✅ 实现MCP服务器Bearer Token认证
- ✅ 支持多种Token传递方式
- ✅ 增强访问日志记录
- ✅ 添加Token验证API

### v1.1.0
- ✅ 添加用户状态管理
- ✅ 扩展用户信息字段
- ✅ 实现访问日志系统
- ✅ 添加用户统计功能
- ✅ 增强权限控制 