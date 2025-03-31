# MCP Hub

A hub server for MCP servers.

## Usage

1. Create a configuration file named `mcp_settings.json` with your MCP server settings:

```json
{
  "mcpServers": {
    "time-mcp": {
      "command": "npx",
      "args": ["-y", "time-mcp"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking"
      ]
    }
  }
}
```

2. Run MCP Hub using Docker:

```bash
docker run -p 3000:3000 -v ./mcp_settings.json:/app/mcp_settings.json samanhappy/mcphub
```

This will:
- Map port 3000 from the container to your local machine
- Mount your local configuration file into the container
- Start the MCP Hub server

3. The server will be available at `http://localhost:3000/sse`

