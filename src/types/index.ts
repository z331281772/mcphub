import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface McpSettings {
  mcpServers: {
    [key: string]: ServerConfig;
  };
}

export interface ServerConfig {
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

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

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AddServerRequest {
  name: string;
  config: ServerConfig;
}