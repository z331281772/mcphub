# MCPHub：一键部署你的专属 MCP 服务

[English Version](README.md) | 中文版

MCPHub 是一个集中管理的 MCP 服务器聚合平台，可以将多个 MCP（Model Context Protocol）服务整合为一个 SSE 端点。它通过提供一个集中的管理界面来简化服务管理，满足您对 MCP 服务的所有需求。

![控制面板预览](assets/dashboard.zh.png)

## 功能

- **内置精选 MCP 服务**：默认安装 `amap-maps`、`playwright`、`slack` 等热门服务，开箱即用。
- **集中管理**：通过单一中心轻松管理多个 MCP 服务。
- **协议兼容**：同时支持 stdio 与 SSE MCP 协议，确保无缝对接。
- **直观控制面板**：通过 Web 界面实时监控服务状态，并动态管理服务。
- **灵活配置**：无需重启中心服务即可添加、移除或重新配置 MCP 服务。

## 快速开始

### 配置（可选但推荐）

- 你可以通过创建 `mcp_settings.json` 文件来自定义 MCP 服务器设置，例如：
  ```json
  {
    "mcpServers": {
      "amap-maps": {
        "command": "npx",
        "args": [
          "-y",
          "@amap/amap-maps-mcp-server"
        ],
        "env": {
          "AMAP_MAPS_API_KEY": "your-api-key"
        }
      },
      "playwright": {
        "command": "npx",
        "args": [
          "@playwright/mcp@latest",
          "--headless"
        ]
      },
      "fetch": {
        "command": "uvx",
        "args": [
          "mcp-server-fetch"
        ]
      },
      "slack": {
        "command": "npx",
        "args": [
          "-y",
          "@modelcontextprotocol/server-slack"
        ],
        "env": {
          "SLACK_BOT_TOKEN": "your-bot-token",
          "SLACK_TEAM_ID": "your-team-id"
        }
      }
    },
    "users": [
      {
        "username": "admin",
        "password": "$2b$10$Vt7krIvjNgyN67LXqly0uOcTpN0LI55cYRbcKC71pUDAP0nJ7RPa.",
        "isAdmin": true
      }
    ]
  }
  ```

- 上述示例中包含 `amap-maps`、`playwright`、`fetch` 和 `slack` 服务器，你可以根据需要增减服务器。
- `users` 部分允许你设置用户认证。默认的 root 用户为 `admin`，密码为 `admin123`，你可以根据需要进行更改。
- 密码使用 bcrypt 进行哈希处理。你可以使用以下命令生成新密码的哈希值：

  ```bash
  npx bcryptjs your-password
  ```

### 启动

运行以下命令即可使用默认配置快速启动 MCPHub：

```bash
docker run -p 3000:3000 samanhappy/mcphub
```

运行以下命令可使用自定义配置启动 MCPHub：

```bash
docker run -p 3000:3000 -v ./mcp_settings.json:/app/mcp_settings.json samanhappy/mcphub
```

### 控制面板访问

在浏览器中打开 `http://localhost:3000` 并使用你在 `mcp_settings.json` 文件中设置的凭据登录。默认凭据为：
- **用户名**：`admin`
- **密码**：`admin123`

控制面板提供以下功能：
- **实时监控**：随时查看所有 MCP 服务的运行状态。
- **服务状态指示**：快速识别各服务是否在线。
- **动态管理**：无需重启即可动态添加或移除 MCP 服务。

### SSE 端点

您可以将主机应用（如 Claude Desktop、Cursor、Cherry Studio 等）无缝连接至 MCPHub 的 SSE 端点： `http://localhost:3000/sse`

## 本地开发

### 克隆仓库

从 GitHub 克隆 MCPHub：

```bash
git clone https://github.com/samanhappy/mcphub.git
```

### 可选配置

通过编辑 `mcp_settings.json` 文件来自定义 MCP 服务器设置。

### 启动开发服务器

进入项目目录，安装依赖并启动 MCPHub：

```bash
cd mcphub && pnpm install && pnpm dev
```

## 社区与贡献

MCPHub 只是我一时兴起开发的小项目，没想到竟收获了这么多关注，非常感谢大家的支持！目前 MCPHub 还有不少地方需要优化和完善，我也专门建了个交流群，方便大家交流反馈。如果你也对这个项目感兴趣，欢迎一起参与建设！

![微信群](assets/wegroup.jpg)

## 许可证

本项目采用 [Apache 2.0 许可证](LICENSE)。
