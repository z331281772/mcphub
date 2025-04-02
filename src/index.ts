import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  registerAllTools,
  getServersInfo,
  getServersSettings,
  addServer,
  removeServer,
} from './server.js';
import path from 'path';

dotenv.config();

let server = new McpServer({
  name: 'mcphub',
  version: '0.0.1',
});

// Register all MCP tools from the modular structure
registerAllTools(server);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static('public'));

// Add conditional JSON parsing middleware
app.use((req, res, next) => {
  if (req.path !== '/sse' && req.path !== '/messages') {
    express.json()(req, res, next);
  } else {
    next();
  }
});

// to support multiple simultaneous connections we have a lookup object from sessionId to transport
const transports: { [sessionId: string]: SSEServerTransport } = {};

// API endpoint to get server and tools information
app.get('/api/servers', (req: Request, res: Response) => {
  const serversInfo = getServersInfo();
  res.json(serversInfo);
});

// API endpoint to get all server settings
app.get('/api/settings', (req: Request, res: Response) => {
  const settings = getServersSettings();
  res.json(settings);
});

// API endpoint to add a new server
app.post('/api/servers', async (req: Request, res: Response) => {
  const { name, config } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, message: 'Server name is required' });
  }

  if (!config || typeof config !== 'object') {
    return res.status(400).json({ success: false, message: 'Server configuration is required' });
  }

  // Validate config has either url or command+args
  if (!config.url && (!config.command || !config.args)) {
    return res.status(400).json({
      success: false,
      message: 'Server configuration must include either a URL or command with arguments',
    });
  }

  const { success, message } = await addServer(server, name, config);
  if (success) {
    res.json({ success: true, message: 'Server added successfully' });
  } else {
    res.status(400).json({ success: false, message: message || 'Failed to add server' });
  }
});

// API endpoint to remove a server
app.delete('/api/servers/:name', async (req: Request, res: Response) => {
  const { name } = req.params;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Server name is required' });
  }

  const result = removeServer(name);
  if (result.success) {
    server = new McpServer({
      name: 'mcphub',
      version: '0.0.1',
    });
    await registerAllTools(server);

    res.json({ success: true, message: 'Server removed successfully' });
  } else {
    res.status(404).json({ success: false, message: 'Server not found or failed to remove' });
  }
});

app.get('/sse', async (_: Request, res: Response) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on('close', () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

// Serve index.html for the root route
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.post('/messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    console.error(`No transport found for sessionId: ${sessionId}`);
    res.status(400).send('No transport found for sessionId');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
