import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as z from 'zod'; 
import { ZodType, ZodRawShape } from 'zod';
import fs from 'fs';
import path from 'path';

// Define settings interface
interface McpSettings {
  mcpServers: {
    [key: string]: {
      url?: string;
      command?: string;
      args?: string[];
      env?: Record<string, string>;
    };
  };
}

// Function to read and parse the settings file
function loadSettings(): McpSettings {
  const settingsPath = path.resolve(process.cwd(), 'mcp_settings.json');
  try {
    const settingsData = fs.readFileSync(settingsPath, 'utf8');
    return JSON.parse(settingsData);
  } catch (error) {
    console.error(`Failed to load settings from ${settingsPath}:`, error);
    return { mcpServers: {} };
  }
}

// Initialize clients and transports from settings
function initializeClientsFromSettings(): {
  clients: Client[];
  transports: (SSEClientTransport | StdioClientTransport)[];
} {
  const settings = loadSettings();
  const clients: Client[] = [];
  const transports: (SSEClientTransport | StdioClientTransport)[] = [];

  Object.entries(settings.mcpServers).forEach(([name, config]) => {
    let transport;

    if (config.url) {
      transport = new SSEClientTransport(new URL(config.url));
    } else if (config.command && config.args) {
      // add PATH to env
      const env = config.env || {};
      env.PATH = process.env.PATH || '';
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: env,
      });
    } else {
      console.warn(`Skipping server '${name}': missing required configuration`);
      return;
    }

    const client = new Client(
      {
        name: `mcp-client-${name}`,
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

    clients.push(client);
    transports.push(transport);
    console.log(`Initialized client for server: ${name}`);
  });

  return { clients, transports };
}

// Initialize clients and transports
const { clients, transports } = initializeClientsFromSettings();

export const registerAllTools = async (server: McpServer) => {
  for (const client of clients) {
    const transportIndex = clients.indexOf(client);
    await client.connect(transports[transportIndex]);
    const tools = await client.listTools();
    for (const tool of tools.tools) {
      console.log(`Registering tool: ${JSON.stringify(tool)}`);
      await server.tool(
        tool.name,
        tool.description || '',
        cast(tool.inputSchema.properties),
        async (params: Record<string, unknown>) => {
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

  const properties = inputSchema as Record<string, { type: string; description?: string }>;
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
  return processedSchema;
}
