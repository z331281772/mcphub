import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ZodType, ZodRawShape } from 'zod';

const transport = new SSEClientTransport(new URL('http://localhost:3001/sse'));

const client = new Client(
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

export const registerAllTools = async (server: McpServer) => {
  await client.connect(transport);
  const tools = await client.listTools();
  for (const tool of tools.tools) {
    await server.tool(
      tool.name,
      tool.description || '',
      cast(tool.inputSchema.properties),
      async (params) => {
        const result = await client.callTool({
          name: tool.name,
          arguments: params,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      },
    );
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

  return castedSchema;
}
