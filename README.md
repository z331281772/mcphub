# MCPHub: One Endpoint, Infinite MCP Servers

MCPHub is a unified hub server that consolidates multiple MCP (Model Context Protocol) servers into one single SSE endpoint. It simplifies service management and provides a centralized interface for all your MCP server needs.

![Dashboard Preview](assets/dashboard.png)

## Features

- **Centralized Management**: Manage multiple MCP servers from a single hub
- **Protocol Support**: Compatible with stdio and SSE MCP protocols
- **Dashboard UI**: Monitor server status and dynamically manage servers through a web interface
- **Dynamic Management**: Add, remove, or reconfigure MCP servers without restarting the hub

## Quick Start

### Docker

```bash
docker run -p 3000:3000 samanhappy/mcphub
```

### Dashboard

Access the interactive management UI at `http://localhost:3000`

The dashboard provides:

- Real-time monitoring of all MCP servers
- Status indicators for all connected services
- Dynamic addition or removal of new MCP servers without restarting

### SSE endpoint

Connect your Host App, such as Claude Desktop, Cursor, Cherry Studio, and more, seamlessly to `http://localhost:3000/sse`.

## Local Development

### Clone the Repository

```bash
git clone https://github.com/samanhappy/mcphub.git
```

### Configuration (Optional)

Edit the `mcp_settings.json` file:

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

### Start the Server

```bash
cd mcphub && pnpm install && pnpm dev
```

## License

[MIT License](LICENSE)
