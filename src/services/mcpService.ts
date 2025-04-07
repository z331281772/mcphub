import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod';
import { ZodType, ZodRawShape } from 'zod';
import { ServerInfo, ServerConfig } from '../types/index.js';
import { loadSettings, saveSettings, expandEnvVars } from '../config/index.js';
import { exec } from 'child_process';

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
      const env: Record<string, string> = config.env || {};
      env['PATH'] = expandEnvVars(process.env.PATH as string) || '';
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
        createTime: Date.now(),
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
    client.connect(transport).catch((error) => {
      console.error(`Failed to connect client for server ${name} by error: ${error}`);
      const serverInfo = getServerInfoByName(name);
      if (serverInfo) {
        serverInfo.status = 'disconnected';
      }
    });
    serverInfos.push({
      name,
      status: 'connecting',
      tools: [],
      client,
      transport,
      createTime: Date.now(),
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
            const currentServer = getServerInfoByName(serverInfo.name)!;
            console.log(`Calling tool: ${tool.name} with params: ${JSON.stringify(params)}`);
            const result = await currentServer.client!.callTool({
              name: tool.name,
              arguments: params,
            });
            console.log(`Tool call result: ${JSON.stringify(result)}`);
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
  return serverInfos.map(({ name, status, tools, createTime }) => ({
    name,
    status,
    tools,
    createTime,
  }));
};

// Get server information by name
const getServerInfoByName = (name: string): ServerInfo | undefined => {
  return serverInfos.find((serverInfo) => serverInfo.name === name);
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
  mcpServer?: McpServer,
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
      registerAllTools(mcpServer).catch((error) => {
        console.error(`Error re-initializing McpServer after removing ${name}:`, error);
      });
    }

    return { success: true, message: 'Server removed successfully' };
  } catch (error) {
    console.error(`Failed to remove server: ${name}`, error);
    return { success: false, message: `Failed to remove server: ${error}` };
  }
};

// Update existing server
export const updateMcpServer = async (
  mcpServer: McpServer,
  name: string,
  config: ServerConfig,
): Promise<{ success: boolean; message?: string }> => {
  try {
    const settings = loadSettings();

    if (!settings.mcpServers[name]) {
      return { success: false, message: 'Server not found' };
    }

    // Update server configuration
    settings.mcpServers[name] = config;

    if (!saveSettings(settings)) {
      return { success: false, message: 'Failed to save settings' };
    }

    // Close existing connections if any
    const serverInfo = serverInfos.find((serverInfo) => serverInfo.name === name);
    if (serverInfo && serverInfo.client) {
      serverInfo.transport?.close();
      // serverInfo.transport = undefined;
      serverInfo.client.close();
      // serverInfo.client = undefined;
      console.log(`Closed existing connection for server: ${name}`);

      // kill process
      // await killProcess(serverInfo);
    }

    // Remove from list
    serverInfos = serverInfos.filter((serverInfo) => serverInfo.name !== name);
    console.log(`Server Infos after removing: ${JSON.stringify(serverInfos)}`);

    return { success: true, message: 'Server updated successfully' };
  } catch (error) {
    console.error(`Failed to update server: ${name}`, error);
    return { success: false, message: 'Failed to update server' };
  }
};

// Kill process by name
export const killProcess = (serverInfo: ServerInfo): Promise<void> => {
  return new Promise((resolve, _) => {
    exec(`pkill -9 "${serverInfo.name}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error killing process ${serverInfo.name}:`, error);
        // Don't reject on error since pkill returns error if no process is found
        resolve();
        return;
      }
      if (stderr) {
        console.error(`Error killing process ${serverInfo.name}:`, stderr);
        // Don't reject on stderr output as it might just be warnings
        resolve();
        return;
      }
      console.log(`Process ${serverInfo.name} killed successfully`);
      resolve();
    });
  });
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

  const properties = inputSchema as Record<
    string,
    { type: string; description?: string; items?: { type: string } }
  >;
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

      if (prop.items) {
        if (prop.items.type === 'string') {
          zodType = z.array(z.string());
        } else if (prop.items.type === 'number') {
          zodType = z.array(z.number());
        } else if (prop.items.type === 'boolean') {
          zodType = z.array(z.boolean());
        } else {
          zodType = z.array(z.any());
        }
      }

      processedSchema[key] = zodType.optional();
    }
  }

  return processedSchema;
}
