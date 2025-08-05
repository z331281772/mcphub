import { Request, Response, NextFunction } from 'express';
import { UserContextService } from '../services/userContextService.js';
import { IUser } from '../types/index.js';

/**
 * User context middleware
 * Sets user context after authentication middleware, allowing service layer to access current user information
 */
export const userContextMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const currentUser = (req as any).user as IUser;

    if (currentUser) {
      // Set user context
      const userContextService = UserContextService.getInstance();
      userContextService.setCurrentUser(currentUser);

      // Clean up user context when response ends
      res.on('finish', () => {
        const userContextService = UserContextService.getInstance();
        userContextService.clearCurrentUser();
      });
    }

    next();
  } catch (error) {
    console.error('Error in user context middleware:', error);
    next(error);
  }
};

/**
 * User context middleware for SSE/MCP endpoints
 * Extracts user from URL path parameter and sets user context
 */
export const sseUserContextMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userContextService = UserContextService.getInstance();
    const username = req.params.user;
    const tokenUser = (req as any).tokenUser;

    if (username) {
      // For user-scoped routes, set the user context
      // Validate user exists and get proper permissions from database
      const userFromDB = require('../models/User.js').findUserByUsername(username);
      const user: IUser = {
        username,
        password: '',
        isAdmin: userFromDB?.isAdmin || false, // Retrieved from user database
      };

      userContextService.setCurrentUser(user);

      // Clean up user context when response ends
      res.on('finish', () => {
        userContextService.clearCurrentUser();
      });

      // Also clean up on connection close for SSE
      res.on('close', () => {
        userContextService.clearCurrentUser();
      });

      console.log(`User context set for SSE/MCP endpoint: ${username}`);
    } else if (tokenUser && tokenUser.username) {
      // For global routes with valid token, use token user information
      const user: IUser = {
        username: tokenUser.username,
        password: '',
        isAdmin: tokenUser.user?.isAdmin || false,
      };

      userContextService.setCurrentUser(user);

      // Clean up user context when response ends
      res.on('finish', () => {
        userContextService.clearCurrentUser();
      });

      // Also clean up on connection close for SSE
      res.on('close', () => {
        userContextService.clearCurrentUser();
      });

      console.log(`User context set for SSE/MCP endpoint from token: ${tokenUser.username}`);
    } else {
      // For global routes without authentication, clear user context
      userContextService.clearCurrentUser();
      console.log('Global SSE/MCP endpoint access - no user context (no token provided)');
    }

    next();
  } catch (error) {
    console.error('Error in SSE user context middleware:', error);
    next(error);
  }
};

/**
 * Extended data service that can directly access current user context
 */
export interface ContextAwareDataService {
  getCurrentUserFromContext(): Promise<IUser | null>;
  getUserDataFromContext(dataType: string): Promise<any>;
  isCurrentUserAdmin(): Promise<boolean>;
}

export class ContextAwareDataServiceImpl implements ContextAwareDataService {
  private getUserContextService() {
    return UserContextService.getInstance();
  }

  async getCurrentUserFromContext(): Promise<IUser | null> {
    const userContextService = this.getUserContextService();
    return userContextService.getCurrentUser();
  }

  async getUserDataFromContext(dataType: string): Promise<any> {
    const userContextService = this.getUserContextService();
    const user = userContextService.getCurrentUser();

    if (!user) {
      throw new Error('No user in context');
    }

    console.log(`Getting ${dataType} data for user: ${user.username}`);

    // Return different data based on user permissions
    if (user.isAdmin) {
      return {
        type: dataType,
        data: 'Admin level data from context',
        user: user.username,
        access: 'full',
      };
    } else {
      return {
        type: dataType,
        data: 'User level data from context',
        user: user.username,
        access: 'limited',
      };
    }
  }

  async isCurrentUserAdmin(): Promise<boolean> {
    const userContextService = this.getUserContextService();
    return userContextService.isAdmin();
  }
}
