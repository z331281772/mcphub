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

// Add type definitions for API responses
export interface ServerInfo {
  name: string;
  status: 'connected' | 'disconnected';
  tools: ToolInfo[];
}

export interface ToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
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

// Function to save settings to file
export function saveSettings(settings: McpSettings): boolean {
  const settingsPath = path.resolve(process.cwd(), 'mcp_settings.json');
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Failed to save settings to ${settingsPath}:`, error);
    return false;
  }
}

// Initialize clients and transports from settings
function initializeClientsFromSettings(): {
  servers: string[];
  clients: Client[];
  transports: (SSEClientTransport | StdioClientTransport)[];
} {
  const settings = loadSettings();
  const servers = Object.keys(settings.mcpServers);
  const clients: Client[] = [];
  const transports: (SSEClientTransport | StdioClientTransport)[] = [];

  Object.entries(settings.mcpServers).forEach(([name, config]) => {
    let transport;

    if (config.url) {
      transport = new SSEClientTransport(new URL(config.url));
    } else if (config.command && config.args) {
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

  return { servers, clients, transports };
}

// Initialize clients and transports
let { servers, clients, transports } = initializeClientsFromSettings();

// Keep track of connected clients and their tools
const clientTools: { [clientIndex: number]: ToolInfo[] } = {};

export const registerAllTools = async (server: McpServer) => {
  for (const client of clients) {
    const index = clients.indexOf(client);
    const serverName = servers[index];
    try {
      await client.connect(transports[index]);
      const tools = await client.listTools();
      clientTools[index] = tools.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema.properties || {},
      }));

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
    } catch (error) {
      console.error(`Failed to connect to server for client: ${serverName} by error: ${error}`);
    }
  }
};

// Add function to get current server status
export function getServersInfo(): ServerInfo[] {
  return servers.map((name, index) => ({
    name,
    status: clientTools[index] ? 'connected' : 'disconnected',
    tools: clientTools[index] || [],
  }));
}

// Add function to get all server settings
export function getServersSettings(): McpSettings {
  return loadSettings();
}

// Add function to add a new server
export async function addServer(
  mcpServer: McpServer,
  name: string,
  config: { url?: string; command?: string; args?: string[]; env?: Record<string, string> },
): Promise<boolean> {
  try {
    const settings = loadSettings();
    if (settings.mcpServers[name]) {
      return false;
    }

    settings.mcpServers[name] = config;

    if (!saveSettings(settings)) {
      return false;
    }

    const result = initializeClientsFromSettings();
    servers = result.servers;
    clients = result.clients;
    transports = result.transports;

    await registerAllTools(mcpServer);

    return true;
  } catch (error) {
    console.error(`Failed to add server: ${name}`, error);
    return false;
  }
}

export function removeServer(name: string): {
  success: boolean;
  newServers?: string[];
  newClients?: Client[];
  newTransports?: (SSEClientTransport | StdioClientTransport)[];
} {
  try {
    const settings = loadSettings();

    if (!settings.mcpServers[name]) {
      return { success: false };
    }

    delete settings.mcpServers[name];

    if (!saveSettings(settings)) {
      return { success: false };
    }

    const result = initializeClientsFromSettings();
    servers = result.servers;
    clients = result.clients;
    transports = result.transports;

    return {
      success: true,
      newServers: result.servers,
      newClients: result.clients,
      newTransports: result.transports,
    };
  } catch (error) {
    console.error(`Failed to remove server: ${name}`, error);
    return { success: false };
  }
}

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
