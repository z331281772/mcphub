import express from 'express';
import config from './config/index.js';
import { createMcpServer, registerAllTools } from './services/mcpService.js';
import { initMiddlewares } from './middlewares/index.js';
import { initRoutes } from './routes/index.js';
import { handleSseConnection, handleSseMessage } from './services/sseService.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export class AppServer {
  private app: express.Application;
  private mcpServer: McpServer;
  private port: number | string;

  constructor() {
    this.app = express();
    this.port = config.port;
    this.mcpServer = createMcpServer(config.mcpHubName, config.mcpHubVersion);
  }

  async initialize(): Promise<void> {
    try {
      registerAllTools(this.mcpServer);
      initMiddlewares(this.app);
      initRoutes(this.app, this.mcpServer);
      this.app.get('/sse', (req, res) => handleSseConnection(req, res, this.mcpServer));
      this.app.post('/messages', handleSseMessage);
      console.log('Server initialized successfully');
    } catch (error) {
      console.error('Error initializing server:', error);
      throw error;
    }
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Server is running on port ${this.port}`);
    });
  }

  getApp(): express.Application {
    return this.app;
  }

  getMcpServer(): McpServer {
    return this.mcpServer;
  }
}

export default AppServer;
