import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod';
import { ZodType, ZodRawShape } from 'zod';
import { ServerInfo, ServerConfig } from '../types/index.js';
import { loadSettings, saveSettings, expandEnvVars } from '../config/index.js';

// Store all server information
let serverInfos: ServerInfo[] = [];

// Initialize MCP server clients
export const initializeClientsFromSettings = (): ServerInfo[] => {
  const settings = loadSettings();
  const existingServerInfos = serverInfos;
  serverInfos = [];

  for (const [name, config] of Object.entries(settings.mcpServers)) {
    // Check if server is already connected
    const existingServer = existingServerInfos.find(
      (s) => s.name === name && s.status === 'connected',
    );
    if (existingServer) {
      serverInfos.push(existingServer);
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
      status: 'connecting',
      tools: [],
      client,
      transport,
    });
    console.log(`Initialized client for server: ${name}`);
  }

  return serverInfos;
};

// Register all MCP tools
export const registerAllTools = async (server: McpServer): Promise<void> => {
  initializeClientsFromSettings();
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

// Get all server information
export const getServersInfo = (): Omit<ServerInfo, 'client' | 'transport'>[] => {
  return serverInfos.map(({ name, status, tools }) => ({
    name,
    status,
    tools,
  }));
};

// Add new server
export const addServer = async (
  mcpServer: McpServer,
  name: string,
  config: ServerConfig,
): Promise<{ success: boolean; message?: string }> => {
  try {
    const settings = loadSettings();

    if (settings.mcpServers[name]) {
      return { success: false, message: 'Server name already exists' };
    }

    settings.mcpServers[name] = config;

    if (!saveSettings(settings)) {
      return { success: false, message: 'Failed to save settings' };
    }

    registerAllTools(mcpServer);

    return { success: true, message: 'Server added successfully' };
  } catch (error) {
    console.error(`Failed to add server: ${name}`, error);
    return { success: false, message: 'Failed to add server' };
  }
};

// Remove server
export const removeServer = (
  name: string,
  mcpServer?: McpServer
): { success: boolean; message?: string } => {
  try {
    const settings = loadSettings();

    if (!settings.mcpServers[name]) {
      return { success: false, message: 'Server not found' };
    }

    delete settings.mcpServers[name];

    if (!saveSettings(settings)) {
      return { success: false, message: 'Failed to save settings' };
    }

    // Close existing connections
    const serverInfo = serverInfos.find((serverInfo) => serverInfo.name === name);
    if (serverInfo && serverInfo.client) {
      serverInfo.client.close();
      serverInfo.transport?.close();
    }

    // Remove from list
    serverInfos = serverInfos.filter((serverInfo) => serverInfo.name !== name);

    // Re-create and initialize the McpServer if provided
    if (mcpServer) {
      console.log(`Re-initializing McpServer after removing ${name}`);
      registerAllTools(mcpServer).catch(error => {
        console.error(`Error re-initializing McpServer after removing ${name}:`, error);
      });
    }

    return { success: true, message: 'Server removed successfully' };
  } catch (error) {
    console.error(`Failed to remove server: ${name}`, error);
    return { success: false, message: `Failed to remove server: ${error}` };
  }
};

// Create McpServer instance
export const createMcpServer = (name: string, version: string): McpServer => {
  return new McpServer({ name, version });
};

// Optimized comments to focus on key details and removed redundant explanations

// Helper function: Convert JSON Schema to Zod Schema
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
        zodType = zodType.describe(prop.description); // Add description to the schema
      }

      processedSchema[key] = zodType.optional();
    }
  }

  return processedSchema;
}
