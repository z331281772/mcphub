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
  status: 'connected' | 'connecting' | 'disconnected';
  tools: ToolInfo[];
  client?: Client;
  transport?: SSEClientTransport | StdioClientTransport;
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
function initializeClientsFromSettings(): ServerInfo[] {
  const settings = loadSettings();

  function expandEnvVars(value: string) {
    return value.replace(/\$\{([^}]+)\}/g, (_, key) => process.env[key] || '');
  }

  for (const [name, config] of Object.entries(settings.mcpServers)) {
    const serverInfo = serverInfos.find((info) => info.name === name);
    if (serverInfo && serverInfo.status === 'connected') {
      console.log(`Server '${name}' is already connected.`);
      continue;
    }

    let transport;

    if (config.url) {
      transport = new SSEClientTransport(new URL(config.url));
    } else if (config.command && config.args) {
      const rawEnv = { ...process.env, ...(config.env || {}) };
      const env: Record<string, string> = {};
      for (const key in rawEnv) {
        if (typeof rawEnv[key] === 'string') {
          env[key] = expandEnvVars(rawEnv[key] as string);
        }
      }

      transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: env,
      });
    } else {
      console.warn(`Skipping server '${name}': missing required configuration`);
      serverInfos.push({
        name,
        status: 'disconnected',
        tools: [],
      });
      continue;
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

    serverInfos.push({
      name,
      status: 'connecting', // Set to connecting when client exists
      tools: [],
      client,
      transport,
    });

    console.log(`Initialized client for server: ${name}`);
  }

  return serverInfos;
}

// Initialize server info
let serverInfos: ServerInfo[] = [];
serverInfos = initializeClientsFromSettings();

// Export the registerAllTools function
export const registerAllTools = async (server: McpServer) => {
  for (const serverInfo of serverInfos) {
    if (serverInfo.status === 'connected') continue;
    if (!serverInfo.client || !serverInfo.transport) continue;

    try {
      serverInfo.status = 'connecting';
      console.log(`Connecting to server: ${serverInfo.name}...`);

      await serverInfo.client.connect(serverInfo.transport);
      const tools = await serverInfo.client.listTools();

      serverInfo.tools = tools.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema.properties || {},
      }));

      serverInfo.status = 'connected';
      console.log(`Successfully connected to server: ${serverInfo.name}`);

      for (const tool of tools.tools) {
        console.log(`Registering tool: ${JSON.stringify(tool)}`);
        await server.tool(
          tool.name,
          tool.description || '',
          cast(tool.inputSchema.properties),
          async (params: Record<string, unknown>) => {
            console.log(`Calling tool: ${tool.name} with params: ${JSON.stringify(params)}`);
            const result = await serverInfo.client!.callTool({
              name: tool.name,
              arguments: params,
            });
            console.log(`Tool result: ${JSON.stringify(result)}`);
            return result as CallToolResult;
          },
        );
      }
    } catch (error) {
      console.error(
        `Failed to connect to server for client: ${serverInfo.name} by error: ${error}`,
      );
      serverInfo.status = 'disconnected';
    }
  }
};

// Add function to get current server status
export function getServersInfo(): ServerInfo[] {
  return serverInfos.map(({ name, status, tools }) => ({
    name,
    status,
    tools,
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
): Promise<{ success: boolean; message?: string }> {
  try {
    const settings = loadSettings();
    if (settings.mcpServers[name]) {
      return { success: false, message: 'Server name already exists' };
    }

    settings.mcpServers[name] = config;

    if (!saveSettings(settings)) {
      return { success: false, message: 'Failed to save settings' };
    }

    serverInfos = initializeClientsFromSettings();
    registerAllTools(mcpServer);

    return { success: true, message: 'Server added successfully' };
  } catch (error) {
    console.error(`Failed to add server: ${name}`, error);
    return { success: false, message: 'Failed to add server' };
  }
}

export function removeServer(name: string): {
  success: boolean;
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

    const serverInfo = serverInfos.find((serverInfo) => serverInfo.name === name);
    if (serverInfo && serverInfo.client) {
      serverInfo.client.close();
      serverInfo.transport?.close();
    }
    serverInfos = serverInfos.filter((serverInfo) => serverInfo.name !== name);
    return { success: true };
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
