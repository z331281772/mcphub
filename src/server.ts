import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ZodType, ZodRawShape } from 'zod';

const transport1 = new SSEClientTransport(new URL('http://localhost:3001/sse'));
const client1 = new Client(
  {
    name: 'example-client',
    version: '1.0.0',
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
    },
  },
);

const transport2 = new StdioClientTransport({
  command: 'python3',
  args: ['-m', 'mcp_server_time', '--local-timezone=America/New_York'],
});
const client2 = new Client(
  {
    name: 'example-client',
    version: '1.0.0',
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
    },
  },
);

const clients = [client1, client2];
const transports = [transport1, transport2];

export const registerAllTools = async (server: McpServer) => {
  for (const client of clients) {
    await client.connect(transports[clients.indexOf(client)]);
    const tools = await client.listTools();
    for (const tool of tools.tools) {
      console.log(`Registering tool: ${JSON.stringify(tool)}`);
      await server.tool(
        tool.name,
        tool.description || '',
        cast(tool.inputSchema.properties),
        async (params) => {
          const result = await client1.callTool({
            name: tool.name,
            arguments: params,
          });
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
      );
    }
  }
};

function cast(inputSchema: unknown): ZodRawShape {
  if (typeof inputSchema !== 'object' || inputSchema === null) {
    throw new Error('Invalid input schema');
  }

  const castedSchema = inputSchema as ZodRawShape;

  for (const key in castedSchema) {
    if (castedSchema[key] instanceof ZodType) {
      castedSchema[key] = castedSchema[key].optional() as ZodType;
    }
  }

  console.log(`Casted schema: ${JSON.stringify(castedSchema)}`);
  return castedSchema;
}
