import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { deleteMcpServer, getMcpServer } from './mcpService.js';
import { loadSettings } from '../config/index.js';
import config from '../config/index.js';
import { UserContextService } from './userContextService.js';

// Thread-safe transport management
class TransportManager {
  private transports: { [sessionId: string]: { transport: Transport; group: string } } = {};
  private lock = false;
  private queue: Array<() => void> = [];

  private async executeWithLock<T>(operation: () => T): Promise<T> {
    return new Promise((resolve) => {
      const execute = () => {
        try {
          const result = operation();
          resolve(result);
        } finally {
          this.lock = false;
          const next = this.queue.shift();
          if (next) next();
        }
      };

      if (this.lock) {
        this.queue.push(execute);
      } else {
        this.lock = true;
        execute();
      }
    });
  }

  async add(sessionId: string, transport: Transport, group: string): Promise<void> {
    return this.executeWithLock(() => {
      this.transports[sessionId] = { transport, group };
    });
  }

  async remove(sessionId: string): Promise<void> {
    return this.executeWithLock(() => {
      delete this.transports[sessionId];
    });
  }

  async get(sessionId: string): Promise<{ transport: Transport; group: string } | undefined> {
    return this.executeWithLock(() => {
      return this.transports[sessionId];
    });
  }

  async getGroup(sessionId: string): Promise<string> {
    return this.executeWithLock(() => {
      return this.transports[sessionId]?.group || '';
    });
  }

  async getCount(): Promise<number> {
    return this.executeWithLock(() => {
      return Object.keys(this.transports).length;
    });
  }
}

const transportManager = new TransportManager();

export const getGroup = async (sessionId: string): Promise<string> => {
  return transportManager.getGroup(sessionId);
};

// Helper function to validate bearer auth
const validateBearerAuth = (req: Request): boolean => {
  const settings = loadSettings();
  const routingConfig = settings.systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
    enableBearerAuth: false,
    bearerAuthKey: '',
  };

  if (routingConfig.enableBearerAuth) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    return token === routingConfig.bearerAuthKey;
  }

  return true;
};

export const handleSseConnection = async (req: Request, res: Response): Promise<void> => {
  // User context is now set by sseUserContextMiddleware
  const userContextService = UserContextService.getInstance();
  const currentUser = userContextService.getCurrentUser();
  const username = currentUser?.username;
  
  // Check bearer auth using filtered settings
  if (!validateBearerAuth(req)) {
    console.warn('Bearer authentication failed or not provided');
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  const settings = loadSettings();
  const routingConfig = settings.systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
    enableBearerAuth: false,
    bearerAuthKey: '',
  };
  const group = req.params.group;

  // Check if this is a global route (no group) and if it's allowed
  if (!group && !routingConfig.enableGlobalRoute) {
    console.warn('Global routes are disabled, group ID is required');
    res.status(403).send('Global routes are disabled. Please specify a group ID.');
    return;
  }

  // For user-scoped routes, validate that the user has access to the requested group
  if (username && group) {
    // Additional validation can be added here to check if user has access to the group
    console.log(`User ${username} accessing group: ${group}`);
  }

  // Construct the appropriate messages path based on user context
  const messagesPath = username 
    ? `${config.basePath}/${username}/messages`
    : `${config.basePath}/messages`;

  console.log(`Creating SSE transport with messages path: ${messagesPath}`);

  const transport = new SSEServerTransport(messagesPath, res);
  await transportManager.add(transport.sessionId, transport, group || '');

  res.on('close', async () => {
    await transportManager.remove(transport.sessionId);
    deleteMcpServer(transport.sessionId);
    console.log(`SSE connection closed: ${transport.sessionId}`);
  });

  console.log(
    `New SSE connection established: ${transport.sessionId} with group: ${group || 'global'}${username ? ` for user: ${username}` : ''}`,
  );
  const mcpServer = await getMcpServer(transport.sessionId, group);
  await mcpServer.connect(transport);
};

export const handleSseMessage = async (req: Request, res: Response): Promise<void> => {
  // User context is now set by sseUserContextMiddleware
  const userContextService = UserContextService.getInstance();
  const currentUser = userContextService.getCurrentUser();
  const username = currentUser?.username;
  
  // Check bearer auth using filtered settings
  if (!validateBearerAuth(req)) {
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  const sessionId = req.query.sessionId as string;

  // Validate sessionId
  if (!sessionId) {
    console.error('Missing sessionId in query parameters');
    res.status(400).send('Missing sessionId parameter');
    return;
  }

  // Check if transport exists before destructuring
  const transportData = await transportManager.get(sessionId);
  if (!transportData) {
    console.warn(`No transport found for sessionId: ${sessionId}`);
    res.status(404).send('No transport found for sessionId');
    return;
  }

  const { transport, group } = transportData;
  req.params.group = group;
  req.query.group = group;
  console.log(`Received message for sessionId: ${sessionId} in group: ${group}${username ? ` for user: ${username}` : ''}`);

  await (transport as SSEServerTransport).handlePostMessage(req, res);
};

export const handleMcpPostRequest = async (req: Request, res: Response): Promise<void> => {
  // User context is now set by sseUserContextMiddleware
  const userContextService = UserContextService.getInstance();
  const currentUser = userContextService.getCurrentUser();
  const username = currentUser?.username;
  
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const group = req.params.group;
  const body = req.body;
  console.log(
    `Handling MCP post request for sessionId: ${sessionId} and group: ${group}${username ? ` for user: ${username}` : ''} with body: ${JSON.stringify(body)}`,
  );
  
  // Check bearer auth using filtered settings
  if (!validateBearerAuth(req)) {
    console.warn('Bearer authentication failed for MCP request');
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  // Get filtered settings based on user context (after setting user context)
  const settings = loadSettings();
  const routingConfig = settings.systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
  };
  if (!group && !routingConfig.enableGlobalRoute) {
    res.status(403).send('Global routes are disabled. Please specify a group ID.');
    return;
  }

  let transport: StreamableHTTPServerTransport;
  const existingTransport = sessionId ? await transportManager.get(sessionId) : null;
  if (sessionId && existingTransport) {
    console.log(`Reusing existing transport for sessionId: ${sessionId}`);
    transport = existingTransport.transport as StreamableHTTPServerTransport;
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: async (sessionId) => {
        await transportManager.add(sessionId, transport, group || '');
      },
    });

    transport.onclose = async () => {
      console.log(`Transport closed: ${transport.sessionId}`);
      if (transport.sessionId) {
        await transportManager.remove(transport.sessionId);
        deleteMcpServer(transport.sessionId);
        console.log(`MCP connection closed: ${transport.sessionId}`);
      }
    };

    console.log(`MCP connection established: ${transport.sessionId}${username ? ` for user: ${username}` : ''}`);
    const mcpServer = await getMcpServer(transport.sessionId, group);
    await mcpServer.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  console.log(`Handling request using transport with type ${transport.constructor.name}`);
  await transport.handleRequest(req, res, req.body);
};

export const handleMcpOtherRequest = async (req: Request, res: Response) => {
  // User context is now set by sseUserContextMiddleware
  const userContextService = UserContextService.getInstance();
  const currentUser = userContextService.getCurrentUser();
  const username = currentUser?.username;
  
  console.log(`Handling MCP other request${username ? ` for user: ${username}` : ''}`);
  
  // Check bearer auth using filtered settings
  if (!validateBearerAuth(req)) {
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const transportData = sessionId ? await transportManager.get(sessionId) : null;
  if (!sessionId || !transportData) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  const { transport } = transportData;
  await (transport as StreamableHTTPServerTransport).handleRequest(req, res);
};

export const getConnectionCount = async (): Promise<number> => {
  return transportManager.getCount();
};
