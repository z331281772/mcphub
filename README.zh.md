# MCPHub: 一个端点，无限 MCP 服务器

[English Version](README.md) | 中文版

MCPHub 是一个统一的集线器服务器，它将多个 MCP（Model Context Protocol）服务器整合到一个 SSE 端点。它简化了服务管理并为所有 MCP 服务器需求提供了集中式接口。

![仪表盘预览](assets/dashboard.png)

## 功能特性

- **集中管理**：从单一集线器管理多个 MCP 服务器
- **协议支持**：兼容 stdio 和 SSE MCP 协议
- **仪表盘界面**：通过 Web 界面监控服务器状态并动态管理服务器
- **动态管理**：无需重启集线器即可添加、删除或重新配置 MCP 服务器

## 快速开始

### Docker

```bash
docker run -p 3000:3000 samanhappy/mcphub
```

### 仪表盘

访问交互式管理界面：`http://localhost:3000`

仪表盘提供：

- 所有 MCP 服务器的实时监控
- 所有连接服务的状态指示器
- 无需重启即可动态添加或移除新的 MCP 服务器

### SSE 端点

将您的宿主应用（如 Claude Desktop、Cursor、Cherry Studio 等）无缝连接到 `http://localhost:3000/sse`。

## 本地开发

### 克隆仓库

```bash
git clone https://github.com/samanhappy/mcphub.git
```

### 配置（可选）

编辑 `mcp_settings.json` 文件：

```json
{
  "mcpServers": {
    "time-mcp": {
      "command": "npx",
      "args": ["-y", "time-mcp"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

### 启动服务器

```bash
cd mcphub && pnpm install && pnpm dev
```

## 许可证

[MIT 许可证](LICENSE)
