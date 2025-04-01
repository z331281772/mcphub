# MCP Hub

A hub server for MCP servers.

## Configuration

MCP Hub allows you to configure multiple MCP servers. You can add as many stdio/sse MCP servers as you want.

The configuration file should be named `mcp_settings.json` and placed in the root directory of the project.

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

### Using Docker

1. Add your `mcp_settings.json` file to the current directory.

2. Run the following command to start the Docker container:

```bash
docker run -p 3000:3000 -v ./mcp_settings.json:/app/mcp_settings.json samanhappy/mcphub
```

### Local Installation

1. Clone the repository:

```bash
git clone https://github.com/samanhappy/mcphub.git
cd mcphub
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the server:

```bash
pnpm dev
```

## Usage

1. Visit Dashboard UI at `http://localhost:3000` to see the status of your MCP servers.
   // image
   ![Dashboard UI](https://raw.githubusercontent.com/samanhappy/mcphub/main/assets/dashboard.png)

2. Use sse endpoint in any application: `http://localhost:3000/sse`
