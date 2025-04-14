import express from 'express';
import { check } from 'express-validator';
import {
  getAllServers,
  getAllSettings,
  createServer,
  updateServer,
  deleteServer,
  toggleServer,
} from '../controllers/serverController.js';
import {
  login,
  register,
  getCurrentUser,
  changePassword
} from '../controllers/authController.js';
import { auth } from '../middlewares/auth.js';

const router = express.Router();

export const initRoutes = (app: express.Application): void => {
  // API routes protected by auth middleware in middlewares/index.ts
  router.get('/servers', getAllServers);
  router.get('/settings', getAllSettings);
  router.post('/servers', createServer);
  router.put('/servers/:name', updateServer);
  router.delete('/servers/:name', deleteServer);
  router.post('/servers/:name/toggle', toggleServer);
  
  // Auth routes (these will NOT be protected by auth middleware)
  app.post('/auth/login', [
    check('username', 'Username is required').not().isEmpty(),
    check('password', 'Password is required').not().isEmpty(),
  ], login);
  
  app.post('/auth/register', [
    check('username', 'Username is required').not().isEmpty(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  ], register);
  
  app.get('/auth/user', auth, getCurrentUser);
  
  // Add change password route
  app.post('/auth/change-password', [
    auth,
    check('currentPassword', 'Current password is required').not().isEmpty(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
  ], changePassword);

  app.use('/api', router);
};

export default router;
