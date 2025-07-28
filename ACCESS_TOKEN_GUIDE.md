# 📘 Access Token 使用指南

## 🔑 **什么是 Access Token？**

Access Token 是用于访问 MCP 服务器的专用令牌，与登录的 JWT Token 不同：

- **JWT Token**: 用于前端 Web 界面登录和 API 访问
- **Access Token**: 用于 MCP 协议连接和工具调用，支持 **Bearer Token 格式**

## 📋 **获取 Access Token**

### 方法 1: 通过 Web 界面
1. 登录管理界面：`http://localhost:3000`
2. 进入 "用户管理" 页面
3. 为每个用户生成或查看 Access Token

### 方法 2: 通过 API
```bash
# 1. 先登录获取 JWT Token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. 生成 Access Token (管理员操作)
curl -X POST http://localhost:3000/api/auth/users/用户名/token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 3. 查看所有用户的 Access Token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/auth/users-with-tokens
```

## 🚀 **如何使用 Access Token（支持 Bearer Token 格式）**

### 1️⃣ **Bearer Token（推荐方式）**
```bash
# MCP 服务器访问
curl -H "Authorization: Bearer mcp_88693b45807d41e4ba75169737a0102a" \
  http://localhost:3000/sse/myserver

# 工具调用
curl -X POST http://localhost:3000/tools/call/amap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mcp_88693b45807d41e4ba75169737a0102a" \
  -d '{"toolName": "amap/maps_weather", "arguments": {"city": "北京"}}'
```

### 2️⃣ **URL 查询参数（SSE 连接推荐）**
```bash
# SSE 连接
http://localhost:3000/sse/group-id?token=mcp_88693b45807d41e4ba75169737a0102a

# Web 界面直接访问
http://localhost:3000?token=mcp_88693b45807d41e4ba75169737a0102a
```

### 3️⃣ **自定义头 x-access-token**
```bash
curl -H "x-access-token: mcp_88693b45807d41e4ba75169737a0102a" \
  http://localhost:3000/api/servers
```

## 📊 **可用的 Access Token**

以下是当前系统中的用户及其 Access Token：

### 管理员用户
- **用户名**: `admin`
- **Access Token**: `mcp_88693b45807d41e4ba75169737a0102a`
- **权限**: 完全访问
- **Bearer Token 使用**: `Authorization: Bearer mcp_88693b45807d41e4ba75169737a0102a`

## 🔗 **使用场景示例**

### 场景 1: EventSource (SSE) 连接
```javascript
// ✅ 推荐：在 URL 中包含 token（EventSource 不支持自定义头）
const eventSource = new EventSource(
  'http://localhost:3000/sse/035231dd-3578-41f9-b46a-883edba199ac?token=mcp_88693b45807d41e4ba75169737a0102a'
);

// ❌ 错误：EventSource 无法设置自定义头
const eventSource = new EventSource(
  'http://localhost:3000/sse/035231dd-3578-41f9-b46a-883edba199ac',
  {
    headers: { 'Authorization': 'Bearer token' } // 不支持！
  }
);
```

### 场景 2: MCP 工具调用（Bearer Token）
```bash
# ✅ 推荐：使用 Bearer Token
curl -X POST http://localhost:3000/tools/call/amap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mcp_88693b45807d41e4ba75169737a0102a" \
  -d '{
    "toolName": "amap/maps_weather",
    "arguments": {"city": "北京"}
  }'
```

### 场景 3: 获取服务器列表（Bearer Token）
```bash
# ✅ 推荐：使用 Bearer Token
curl -H "Authorization: Bearer mcp_88693b45807d41e4ba75169737a0102a" \
  http://localhost:3000/api/servers

# 备选：使用自定义头
curl -H "x-access-token: mcp_88693b45807d41e4ba75169737a0102a" \
  http://localhost:3000/api/servers
```

### 场景 4: WebSocket 连接
```javascript
// 在 WebSocket URL 中包含 token（推荐）
const ws = new WebSocket(
  'ws://localhost:3000/mcp/group-id?token=mcp_88693b45807d41e4ba75169737a0102a'
);

// 或在连接建立后发送 Bearer Token（如果协议支持）
```

## 🔧 **故障排除**

### 401 Unauthorized 错误
```json
{
  "success": false,
  "error": "Access token required. Please provide token via query parameter (?token=...) or Authorization header (Bearer ...)."
}
```

**解决方案**:
1. 确认 Access Token 正确
2. 检查 token 格式（应以 `mcp_` 开头）
3. 确认用户状态为 active
4. **优先使用 Bearer Token 格式**: `Authorization: Bearer mcp_xxxx`

### Invalid access token 错误
```json
{
  "success": false,
  "error": "Invalid access token"
}
```

**解决方案**:
1. 重新生成 Access Token
2. 检查用户是否被禁用
3. 确认 token 没有过期

## 🛡️ **安全注意事项**

1. **保护 Token**: Access Token 等同于密码，不要在不安全的地方暴露
2. **使用 Bearer Token**: 推荐使用标准的 Bearer Token 格式
3. **定期轮换**: 定期更新 Access Token
4. **最小权限**: 普通用户只能访问 MCP 服务器，不能管理其他用户
5. **日志监控**: 系统会记录所有 token 使用情况

## 📈 **认证方式对比**

| 操作 | JWT Token | Access Token (Bearer) | Access Token (Query) |
|------|-----------|----------------------|---------------------|
| 前端登录 | ✅ | ❌ | ❌ |
| 用户管理 | ✅ (管理员) | ❌ | ❌ |
| MCP 服务器访问 | ✅ | ✅ **推荐** | ✅ |
| 工具调用 | ✅ | ✅ **推荐** | ✅ |
| SSE 连接 | ✅ | ❌ | ✅ **推荐** |
| 访问日志查看 | ✅ (管理员) | ❌ | ❌ |

## 🎯 **最佳实践**

1. **API 调用**: 优先使用 `Authorization: Bearer mcp_xxx` 格式
2. **SSE 连接**: 使用查询参数 `?token=mcp_xxx`（EventSource 限制）
3. **WebSocket**: 根据协议支持选择合适的方式
4. **调试**: 检查服务器日志确认认证类型和token使用情况

---

💡 **提示**: 如需帮助，请访问 Web 界面的用户管理页面或查看 API 文档。Bearer Token 是标准的 HTTP 认证方式，推荐在所有支持的场景中使用。 