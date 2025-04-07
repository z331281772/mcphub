import express from 'express';
import {
  getAllServers,
  getAllSettings,
  createServer,
  updateServer,
  deleteServer,
} from '../controllers/serverController.js';

const router = express.Router();

export const initRoutes = (app: express.Application): void => {
  router.get('/servers', getAllServers);
  router.get('/settings', getAllSettings);
  router.post('/servers', createServer);
  router.put('/servers/:name', updateServer);
  router.delete('/servers/:name', deleteServer);

  app.use('/api', router);
};

export default router;
