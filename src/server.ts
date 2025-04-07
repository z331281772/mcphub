import express from 'express';
import config from './config/index.js';
import { initMcpServer, registerAllTools } from './services/mcpService.js';
import { initMiddlewares } from './middlewares/index.js';
import { initRoutes } from './routes/index.js';
import { handleSseConnection, handleSseMessage } from './services/sseService.js';

export class AppServer {
  private app: express.Application;
  private port: number | string;

  constructor() {
    this.app = express();
    this.port = config.port;
  }

  async initialize(): Promise<void> {
    try {
      const mcpServer = await initMcpServer(config.mcpHubName, config.mcpHubVersion);
      await registerAllTools(mcpServer, true);
      initMiddlewares(this.app);
      initRoutes(this.app);
      this.app.get('/sse', (req, res) => handleSseConnection(req, res));
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
}

export default AppServer;
