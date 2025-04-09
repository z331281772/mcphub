import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod';
import { ZodType, ZodRawShape } from 'zod';
import { ServerInfo, ServerConfig } from '../types/index.js';
import { loadSettings, saveSettings, expandEnvVars } from '../config/index.js';
import config from '../config/index.js';

let mcpServer: McpServer;

export const initMcpServer = (name: string, version: string): McpServer => {
  mcpServer = new McpServer({ name, version });
  return mcpServer;
};

export const setMcpServer = (server: McpServer): void => {
  mcpServer = server;
};

export const getMcpServer = (): McpServer => {
  return mcpServer;
};

export const recreateMcpServer = async () => {
  console.log('Re-creating McpServer instance');
  const newServer = createMcpServer(config.mcpHubName, config.mcpHubVersion);
  await registerAllTools(newServer, true);
  const oldServer = getMcpServer();
  setMcpServer(newServer);
  oldServer.close();
  console.log('McpServer instance successfully re-created');
};

// Store all server information
let serverInfos: ServerInfo[] = [];

// Initialize MCP server clients
export const initializeClientsFromSettings = (): ServerInfo[] => {
  const settings = loadSettings();
  const existingServerInfos = serverInfos;
  serverInfos = [];

  for (const [name, conf] of Object.entries(settings.mcpServers)) {
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
    if (conf.url) {
      transport = new SSEClientTransport(new URL(conf.url));
    } else if (conf.command && conf.args) {
      const env: Record<string, string> = conf.env || {};
      env['PATH'] = expandEnvVars(process.env.PATH as string) || '';
      transport = new StdioClientTransport({
        command: conf.command,
        args: conf.args,
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
    client.connect(transport, { timeout: Number(config.timeout) }).catch((error) => {
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
export const registerAllTools = async (server: McpServer, forceInit: boolean): Promise<void> => {
  initializeClientsFromSettings();
  for (const serverInfo of serverInfos) {
    if (serverInfo.status === 'connected' && !forceInit) continue;
    if (!serverInfo.client || !serverInfo.transport) continue;

    try {
      serverInfo.status = 'connecting';
      console.log(`Connecting to server: ${serverInfo.name}...`);

      const tools = await serverInfo.client.listTools({}, { timeout: Number(config.timeout) });
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

    registerAllTools(mcpServer, false);
    return { success: true, message: 'Server added successfully' };
  } catch (error) {
    console.error(`Failed to add server: ${name}`, error);
    return { success: false, message: 'Failed to add server' };
  }
};

// Remove server
export const removeServer = (name: string): { success: boolean; message?: string } => {
  try {
    const settings = loadSettings();

    if (!settings.mcpServers[name]) {
      return { success: false, message: 'Server not found' };
    }

    delete settings.mcpServers[name];

    if (!saveSettings(settings)) {
      return { success: false, message: 'Failed to save settings' };
    }

    serverInfos = serverInfos.filter((serverInfo) => serverInfo.name !== name);
    return { success: true, message: 'Server removed successfully' };
  } catch (error) {
    console.error(`Failed to remove server: ${name}`, error);
    return { success: false, message: `Failed to remove server: ${error}` };
  }
};

// Update existing server
export const updateMcpServer = async (
  name: string,
  config: ServerConfig,
): Promise<{ success: boolean; message?: string }> => {
  try {
    const settings = loadSettings();
    if (!settings.mcpServers[name]) {
      return { success: false, message: 'Server not found' };
    }

    settings.mcpServers[name] = config;
    if (!saveSettings(settings)) {
      return { success: false, message: 'Failed to save settings' };
    }

    const serverInfo = serverInfos.find((serverInfo) => serverInfo.name === name);
    if (serverInfo) {
      serverInfo.client!.close();
      serverInfo.transport!.close();
      console.log(`Closed client and transport for server: ${name}`);
      // TODO kill process
    }

    serverInfos = serverInfos.filter((serverInfo) => serverInfo.name !== name);
    return { success: true, message: 'Server updated successfully' };
  } catch (error) {
    console.error(`Failed to update server: ${name}`, error);
    return { success: false, message: 'Failed to update server' };
  }
};

// Create McpServer instance
export const createMcpServer = (name: string, version: string): McpServer => {
  return new McpServer({ name, version });
};

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
