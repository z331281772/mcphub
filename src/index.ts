import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { registerAllTools, getServersInfo } from './server.js';
import path from 'path';

dotenv.config();

const server = new McpServer({
  name: 'mcphub',
  version: '0.0.1',
});

// Register all MCP tools from the modular structure
await registerAllTools(server);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static('public'));

// to support multiple simultaneous connections we have a lookup object from sessionId to transport
const transports: { [sessionId: string]: SSEServerTransport } = {};

// API endpoint to get server and tools information
app.get('/api/servers', (req: Request, res: Response) => {
  const serversInfo = getServersInfo();
  res.json(serversInfo);
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
