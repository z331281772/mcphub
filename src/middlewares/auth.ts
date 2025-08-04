import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { loadSettings } from '../config/index.js';

// JWT Secret key - critical for security
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your-secret-key-change-this') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment and cannot be the default value');
    }
    console.warn('WARNING: Using default JWT secret. This is ONLY acceptable in development!');
    return 'your-secret-key-change-this';
  }
  return secret;
})();

const validateBearerAuth = (req: Request, routingConfig: any): boolean => {
  if (!routingConfig.enableBearerAuth) {
    return false;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  return authHeader.substring(7) === routingConfig.bearerAuthKey;
};

// Middleware to authenticate JWT token
export const auth = (req: Request, res: Response, next: NextFunction): void => {
  // Check if authentication is disabled globally
  const routingConfig = loadSettings().systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
    enableBearerAuth: false,
    bearerAuthKey: '',
    skipAuth: false,
  };

  if (routingConfig.skipAuth) {
    next();
    return;
  }

  // Check if bearer auth is enabled and validate it
  if (validateBearerAuth(req, routingConfig)) {
    next();
    return;
  }

  // Get token from header or query parameter
  const headerToken = req.header('x-auth-token');
  const queryToken = req.query.token as string;
  const token = headerToken || queryToken;

  // Check if no token
  if (!token) {
    res.status(401).json({ success: false, message: 'No token, authorization denied' });
    return;
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add user from payload to request
    (req as any).user = (decoded as any).user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};
