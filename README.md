# MCPHub

MCPHub is a unified hub server that consolidates multiple MCP (Model Context Protocol) servers into a single SSE endpoint. It simplifies service management and provides a centralized interface for all your MCP needs.

## Features

- **Centralized Management**: Manage multiple MCP servers from a single hub
- **Protocol Support**: Compatible with stdio and SSE MCP protocols
- **Dashboard UI**: Monitor server status through a web interface
- **Easy Configuration**: Simple JSON-based configuration system

## Configuration

Create a `mcp_settings.json` file in your project root:

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

## Installation

### Docker (Recommended)

```bash
docker run -p 3000:3000 -v $(pwd)/mcp_settings.json:/app/mcp_settings.json samanhappy/mcphub
```

### Manual Installation

```bash
git clone https://github.com/samanhappy/mcphub.git
cd mcphub
pnpm install
pnpm dev
```

## Usage

### Dashboard
Access the monitoring UI at `http://localhost:3000`

![Dashboard Preview](assets/dashboard.png)

### API Endpoint 
Connect your applications to `http://localhost:3000/sse`


## Requirements

- Node.js 14+ (for manual installation)
- Docker (for containerized deployment)

## License

[MIT License](LICENSE)
