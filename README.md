# MCPHub: Deploy Your Own MCP Servers in Minutes

English | [中文版](README.zh.md)

MCPHub is a unified hub server that consolidates multiple MCP (Model Context Protocol) servers into a single SSE endpoint. It streamlines service management by offering a centralized interface for all your MCP server needs.

![Dashboard Preview](assets/dashboard.png)

## Features

- **Built-in featured MCP Servers**: Comes with featured MCP servers like `amap-maps`, `playwright`, `slack`, and more.
- **Centralized Management**: Oversee multiple MCP servers from one convenient hub.
- **Broad Protocol Support**: Works seamlessly with both stdio and SSE MCP protocols.
- **Intuitive Dashboard UI**: Monitor server status and manage servers dynamically via a web interface.
- **Flexible Server Management**: Add, remove, or reconfigure MCP servers without restarting the hub.

## Quick Start

### Configuration (Optional but Recommended)

- Customize your MCP server settings by creating the `mcp_settings.json` file. For example:
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

- The above example includes the `amap-maps`, `playwright`, `fetch`, and `slack` servers. You can add or remove servers as needed.
- The `users` section allows you to set up user authentication. The default root user is `admin` with the password `admin123`. You can change them as needed.
- The password is hashed using bcrypt. You can generate a new password hash using the following command:

  ```bash
  npx bcryptjs your-password
  ```

### Starting MCPHub with Docker

Run the following command to quickly launch MCPHub with default settings:

```bash
docker run -p 3000:3000 samanhappy/mcphub
```

Run the following command to launch MCPHub with custom settings:

```bash
docker run -p 3000:3000 -v ./mcp_settings.json:/app/mcp_settings.json samanhappy/mcphub
```

### Dashboard Access

Open your web browser and navigate to: `http://localhost:3000`, then login using the credentials you set in the `mcp_settings.json` file.
The default credentials are:
- **Username**: `admin`
- **Password**: `admin123`

The dashboard provides:
- **Real-Time Monitoring**: Keep an eye on the status of all MCP servers.
- **Service Status Indicators**: Quickly see which services are online.
- **Dynamic Server Management**: Add or remove MCP servers on the fly without needing to restart.

### SSE Endpoint

Seamlessly connect your host applications (e.g., Claude Desktop, Cursor, Cherry Studio, etc.) to the MCPHub SSE endpoint at: `http://localhost:3000/sse`

## Local Development

### Clone the Repository

Clone MCPHub from GitHub:

```bash
git clone https://github.com/samanhappy/mcphub.git
```

### Optional Configuration

Customize your MCP server settings by editing the `mcp_settings.json` file.

### Start the Development Server

Install dependencies and launch MCPHub:

```bash
cd mcphub && pnpm install && pnpm dev
```

## Community and Contributions

MCPHub started as a small side project that I developed on a whim, and I'm amazed at the attention it has received. Thank you all for your support! 

Currently, MCPHub still has many areas that need optimization and improvement. Any contributions, whether in the form of code, documentation, or suggestions, are more than welcome.

## License

This project is licensed under the [Apache 2.0 license](LICENSE).
