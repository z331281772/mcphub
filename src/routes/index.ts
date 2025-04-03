import express from 'express';
import { 
  getAllServers, 
  getAllSettings, 
  createServer, 
  deleteServer,
  setMcpServerInstance
} from '../controllers/serverController.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const router = express.Router();

export const initRoutes = (app: express.Application, server: McpServer): void => {
  setMcpServerInstance(server);

  router.get('/servers', getAllServers);
  router.get('/settings', getAllSettings);
  router.post('/servers', createServer);
  router.delete('/servers/:name', deleteServer);

  app.use('/api', router);
};

export default router;