import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { z, ZodType, ZodRawShape } from 'zod';

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
          console.log(`Calling tool: ${tool.name} with params: ${JSON.stringify(params)}`);
          const result = await client.callTool({
            name: tool.name,
            arguments: params,
          });
          console.log(`Tool result: ${JSON.stringify(result)}`);
          return result as CallToolResult;
        },
      );
    }
  }
};

function cast(inputSchema: unknown): ZodRawShape {
  if (typeof inputSchema !== 'object' || inputSchema === null) {
    throw new Error('Invalid input schema');
  }

  const properties = inputSchema as Record<string, any>;
  const processedSchema: ZodRawShape = {};
  for (const key in properties) {
    const prop = properties[key];
    if (prop instanceof ZodType) {
      processedSchema[key] = prop.optional();
    } else if (typeof prop === 'object' && prop !== null) {
      let zodType: ZodType;
      switch (prop.type) {
        case 'string':
          zodType = z.string();
          break;
        case 'number':
          zodType = z.number();
          break;
        case 'boolean':
          zodType = z.boolean();
          break;
        case 'integer':
          zodType = z.number().int();
          break;
        case 'array':
          zodType = z.array(z.any());
          break;
        case 'object':
          zodType = z.record(z.any());
          break;
        default:
          zodType = z.any();
      }

      if (prop.description) {
        zodType = zodType.describe(prop.description);
      }

      processedSchema[key] = zodType.optional();
    }
  }

  console.log(`Processed schema: ${JSON.stringify(processedSchema)}`);
  return processedSchema;
}
