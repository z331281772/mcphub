import { Request, Response, NextFunction } from 'express';
import { validateAccessToken, updateLastActivity } from '../models/User.js';
import { loadSettings } from '../config/index.js';

// Helper function to extract token from request
const extractToken = (req: Request): string | null => {
  // Check query parameter first
  if (req.query.token) {
    return req.query.token as string;
  }

  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check custom header
  if (req.headers['x-access-token']) {
    return req.headers['x-access-token'] as string;
  }

  return null;
};

// Token authentication middleware for MCP server access
export const tokenAuth = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required. Please provide token via query parameter (?token=...) or Authorization header (Bearer ...).'
      });
      return;
    }

    const validation = validateAccessToken(token);

    if (!validation.valid) {
      res.status(401).json({
        success: false,
        error: validation.error || 'Invalid access token'
      });
      return;
    }

    // Attach user information to request
    (req as any).tokenUser = {
      username: validation.username,
      user: validation.user,
      token: token
    };

    // Update user's last activity
    if (validation.username) {
      updateLastActivity(validation.username);
    }

    next();
  };
};

// Optional token auth (allows anonymous access but logs user if token provided)
// This will become mandatory if requireMcpAuth is enabled in system config
export const optionalTokenAuth = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const settings = loadSettings();
    const requireMcpAuth = settings.systemConfig?.routing?.requireMcpAuth || false;

    const token = extractToken(req);

    // If MCP auth is required but no token provided, reject
    if (requireMcpAuth && !token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required for MCP service access. Please provide a valid access token.'
      });
      return;
    }

    if (token) {
      const validation = validateAccessToken(token);

      // If MCP auth is required and token is invalid, reject
      if (requireMcpAuth && !validation.valid) {
        res.status(401).json({
          success: false,
          error: validation.error || 'Invalid access token for MCP service access'
        });
        return;
      }

      if (validation.valid) {
        // Attach user information to request
        (req as any).tokenUser = {
          username: validation.username,
          user: validation.user,
          token: token
        };

        // Update user's last activity
        if (validation.username) {
          updateLastActivity(validation.username);
        }
      }
    }

    // Continue regardless of token validation result (unless MCP auth is required)
    next();
  };
};

// Middleware to check if user has access to specific server/group
export const checkServerAccess = (allowAnonymous: boolean = false) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const tokenUser = (req as any).tokenUser;

    if (!tokenUser && !allowAnonymous) {
      res.status(401).json({
        success: false,
        error: 'Authentication required to access MCP servers'
      });
      return;
    }

    // TODO: Add group-based access control here if needed
    // For now, all authenticated users have access to all servers

    next();
  };
}; 