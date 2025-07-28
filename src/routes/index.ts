import express from 'express';
import { check } from 'express-validator';
import config from '../config/index.js';
import {
  getAllServers,
  getAllSettings,
  createServer,
  updateServer,
  deleteServer,
  toggleServer,
  toggleTool,
  updateToolDescription,
  updateSystemConfig,
} from '../controllers/serverController.js';
import {
  getGroups,
  getGroup,
  createNewGroup,
  updateExistingGroup,
  deleteExistingGroup,
  addServerToExistingGroup,
  removeServerFromExistingGroup,
  getGroupServers,
  updateGroupServersBatch,
} from '../controllers/groupController.js';
import {
  getUsers,
  getUser,
  createUser,
  updateExistingUser,
  deleteExistingUser,
  getUserStats,
} from '../controllers/userController.js';
import {
  getAllMarketServers,
  getMarketServer,
  getAllMarketCategories,
  getAllMarketTags,
  searchMarketServersByQuery,
  getMarketServersByCategory,
  getMarketServersByTag,
} from '../controllers/marketController.js';
import { 
  login, 
  register, 
  getCurrentUser, 
  changePassword,
  getAllUsers,
  getUsersWithTokens,
  updateUserInfo,
  deleteUserAccount,
  updateUserAccountStatus,
  generateUserAccessToken,
  updateUserAccessToken,
  revokeUserAccessToken,
  validateUserAccessToken,
  getUserStatistics,
  getAllUsersStatistics,
} from '../controllers/authController.js';
import { 
  getAccessLogs,
  getSystemOverview,
  cleanOldLogs,
  clearAllLogs,
  exportLogs,
} from '../controllers/accessLogController.js';
import {
  getMcpUsageStats,
  getUserMcpUsageStats,
  getMcpUsageLogs,
  clearMcpUsageLogs,
  getMcpUsageOverview,
  getUserAccessDetails,
  exportUserAccessDetails,
} from '../controllers/mcpUsageController.js';
import { getAllLogs, clearLogs, streamLogs } from '../controllers/logController.js';
import { getRuntimeConfig, getPublicConfig } from '../controllers/configController.js';
import { callTool } from '../controllers/toolController.js';
import { uploadDxtFile, uploadMiddleware } from '../controllers/dxtController.js';
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
  router.post('/servers/:serverName/tools/:toolName/toggle', toggleTool);
  router.put('/servers/:serverName/tools/:toolName/description', updateToolDescription);
  router.put('/system-config', updateSystemConfig);

  // Group management routes
  router.get('/groups', getGroups);
  router.get('/groups/:id', getGroup);
  router.post('/groups', createNewGroup);
  router.put('/groups/:id', updateExistingGroup);
  router.delete('/groups/:id', deleteExistingGroup);
  router.post('/groups/:id/servers', addServerToExistingGroup);
  router.delete('/groups/:id/servers/:serverName', removeServerFromExistingGroup);
  router.get('/groups/:id/servers', getGroupServers);
  // New route for batch updating servers in a group
  router.put('/groups/:id/servers/batch', updateGroupServersBatch);

  // User management routes (admin only)
  router.get('/users', getUsers);
  router.get('/users/:username', getUser);
  router.post('/users', createUser);
  router.put('/users/:username', updateExistingUser);
  router.delete('/users/:username', deleteExistingUser);
  router.get('/users-stats', getUserStats);

  // Tool management routes
  router.post('/tools/call/:server', callTool);

  // DXT upload routes
  router.post('/dxt/upload', uploadMiddleware, uploadDxtFile);

  // Market routes
  router.get('/market/servers', getAllMarketServers);
  router.get('/market/servers/search', searchMarketServersByQuery);
  router.get('/market/servers/:name', getMarketServer);
  router.get('/market/categories', getAllMarketCategories);
  router.get('/market/categories/:category', getMarketServersByCategory);
  router.get('/market/tags', getAllMarketTags);
  router.get('/market/tags/:tag', getMarketServersByTag);

  // Log routes
  router.get('/logs', getAllLogs);
  router.delete('/logs', clearLogs);
  router.get('/logs/stream', streamLogs);

  // Auth routes - move to router instead of app directly
  router.post(
    '/auth/login',
    [
      check('username', 'Username is required').not().isEmpty(),
      check('password', 'Password is required').not().isEmpty(),
    ],
    login,
  );

  router.post(
    '/auth/register',
    [
      check('username', 'Username is required').not().isEmpty(),
      check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    ],
    register,
  );

  router.get('/auth/user', auth, getCurrentUser);
  router.get('/auth/me', auth, getCurrentUser);

  // Add change password route
  router.post(
    '/auth/change-password',
    [
      auth,
      check('currentPassword', 'Current password is required').not().isEmpty(),
      check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
    ],
    changePassword,
  );

  // Extended user management routes (admin only)
  router.get('/auth/users', getAllUsers);
  router.get('/auth/users-with-tokens', getUsersWithTokens);
  router.put('/auth/users/:username', updateUserInfo);
  router.delete('/auth/users/:username', deleteUserAccount);
  router.put('/auth/users/:username/status', updateUserAccountStatus);

  // Token management routes (admin only)
  router.post('/auth/users/:username/token', generateUserAccessToken);
  router.put('/auth/users/:username/token', updateUserAccessToken);
  router.delete('/auth/users/:username/token', revokeUserAccessToken);
  router.post('/auth/validate-token', validateUserAccessToken);

  // User statistics routes
  router.get('/auth/users/:username/statistics', getUserStatistics);
  router.get('/auth/users-statistics', getAllUsersStatistics);

  // Access log routes
  router.get('/access-logs', getAccessLogs);
  router.get('/access-logs/overview', getSystemOverview);
  router.post('/access-logs/clean', cleanOldLogs);
  router.delete('/access-logs', clearAllLogs);
  router.get('/access-logs/export', exportLogs);

  // MCP usage routes
  router.get('/mcp-usage/stats', getMcpUsageStats);
  router.get('/mcp-usage/overview', getMcpUsageOverview);
  router.get('/mcp-usage/logs', getMcpUsageLogs);
  router.delete('/mcp-usage/logs', clearMcpUsageLogs);
  router.get('/mcp-usage/users/:username', getUserMcpUsageStats);
  router.get('/mcp-usage/access-details', getUserAccessDetails);
  router.get('/mcp-usage/export', exportUserAccessDetails);

  // Runtime configuration endpoint (no auth required for frontend initialization)
  app.get(`${config.basePath}/config`, getRuntimeConfig);

  // Public configuration endpoint (no auth required to check skipAuth setting)
  app.get(`${config.basePath}/public-config`, getPublicConfig);

  app.use(`${config.basePath}/api`, router);
};

export default router;
