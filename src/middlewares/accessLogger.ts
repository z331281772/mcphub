import { Request, Response, NextFunction } from 'express';
import accessLogService from '../services/accessLogService.js';
import { updateLastActivity } from '../models/User.js';

// Helper function to get client IP
const getClientIP = (req: Request): string => {
  return (req.headers['x-forwarded-for'] as string) || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         'unknown';
};

// Helper function to determine action type based on request
const getActionType = (req: Request): string => {
  const path = req.path;
  const method = req.method;

  // Authentication actions
  if (path.includes('/auth/login')) return 'login';
  if (path.includes('/auth/register')) return 'register';
  if (path.includes('/auth/change-password')) return 'change_password';

  // User management actions
  if (path.includes('/auth/users')) {
    if (method === 'GET') return 'user_list';
    if (method === 'PUT') return 'user_update';
    if (method === 'DELETE') return 'user_delete';
  }
  if (path.includes('/auth/users') && path.includes('/status')) return 'user_status_update';
  if (path.includes('/auth/users') && path.includes('/statistics')) return 'user_statistics';
  if (path.includes('/auth/users') && path.includes('/token')) {
    if (method === 'POST') return 'token_generate';
    if (method === 'PUT') return 'token_update';
    if (method === 'DELETE') return 'token_revoke';
  }
  if (path.includes('/auth/validate-token')) return 'token_validate';

  // Server management actions
  if (path.includes('/servers')) {
    if (method === 'GET') return 'server_list';
    if (method === 'POST') return 'server_create';
    if (method === 'PUT') return 'server_update';
    if (method === 'DELETE') return 'server_delete';
  }
  if (path.includes('/servers') && path.includes('/toggle')) return 'server_toggle';

  // Tool actions
  if (path.includes('/tools/call')) return 'tool_call';
  if (path.includes('/tools') && path.includes('/toggle')) return 'tool_toggle';

  // Group management actions
  if (path.includes('/groups')) {
    if (method === 'GET') return 'group_list';
    if (method === 'POST') return 'group_create';
    if (method === 'PUT') return 'group_update';
    if (method === 'DELETE') return 'group_delete';
  }

  // Log actions
  if (path.includes('/logs')) {
    if (method === 'GET') return 'log_view';
    if (method === 'DELETE') return 'log_clear';
  }

  // Access log actions
  if (path.includes('/access-logs')) {
    if (method === 'GET') return 'access_log_view';
    if (method === 'DELETE') return 'access_log_clear';
  }

  // Market actions
  if (path.includes('/market')) return 'market_browse';

  // MCP server access
  if (path.includes('/mcp/')) return 'server_access';
  if (path.includes('/sse/')) return 'sse_connection';

  // Default action
  return 'api_request';
};

// Helper function to extract resource details
const getResourceDetails = (req: Request) => {
  const path = req.path;
  const params = req.params;
  const query = req.query;
  const body = req.body;

  const details: any = {};

  // Extract server name from path
  if (params.name || params.serverName) {
    details.serverName = params.name || params.serverName;
  }

  // Extract tool name from path
  if (params.toolName) {
    details.toolName = params.toolName;
  }

  // Extract group ID
  if (params.id && path.includes('/groups/')) {
    details.groupId = params.id;
  }

  // Extract username for user operations
  if (params.username) {
    details.targetUsername = params.username;
  }

  // For tool calls, include tool and server info
  if (path.includes('/tools/call') && body) {
    details.toolName = body.name;
    details.arguments = body.arguments ? Object.keys(body.arguments) : [];
  }

  // For server access via MCP, extract server from path
  if (path.includes('/mcp/') || path.includes('/sse/')) {
    const pathParts = path.split('/');
    const mcpIndex = pathParts.findIndex((p: string) => p === 'mcp' || p === 'sse');
    if (mcpIndex !== -1 && pathParts[mcpIndex + 1]) {
      details.serverName = pathParts[mcpIndex + 1];
    }
  }

  return details;
};

// Helper function to get username from request
const getUsername = (req: Request): string => {
  // Priority order: tokenUser > user > anonymous
  if ((req as any).tokenUser && (req as any).tokenUser.username) {
    return (req as any).tokenUser.username;
  }
  
  if ((req as any).user && (req as any).user.username) {
    return (req as any).user.username;
  }
  
  return 'anonymous';
};

// Access logging middleware
export const accessLogger = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    // Override res.send to capture response data
    res.send = function(body: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Only log if user is authenticated (except for login/register)
      const user = (req as any).user;
      const tokenUser = (req as any).tokenUser;
      const path = req.path;
      const shouldLog = user || tokenUser || path.includes('/auth/login') || path.includes('/auth/register');
      
      if (shouldLog) {
        const username = getUsername(req);
        const action = getActionType(req);
        const resource = req.path;
        const method = req.method;
        const statusCode = res.statusCode;
        const ip = getClientIP(req);
        const userAgent = req.headers['user-agent'];
        const details = getResourceDetails(req);

        // Add authentication type to details for debugging
        details.authType = tokenUser ? 'token' : (user ? 'jwt' : 'anonymous');

        // Log the access
        accessLogService.logAccess(
          username,
          action,
          resource,
          method,
          statusCode,
          ip,
          userAgent,
          duration,
          details
        );

        // Update user's last activity time (if authenticated)
        const actualUsername = username !== 'anonymous' ? username : null;
        if (actualUsername) {
          updateLastActivity(actualUsername);
        }
      }

      // Call the original send method
      return originalSend.call(this, body);
    };

    next();
  };
};

// Middleware specifically for MCP server access logging
export const mcpAccessLogger = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    res.send = function(body: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Try to extract user from different sources
      let username = 'anonymous';
      
      // Check for user from token authentication
      if ((req as any).tokenUser) {
        username = (req as any).tokenUser.username;
      }
      // Check for user in request (from JWT auth middleware)
      else if ((req as any).user) {
        username = (req as any).user.username;
      }

      const action = 'server_access';
      const resource = req.path;
      const method = req.method;
      const statusCode = res.statusCode;
      const ip = getClientIP(req);
      const userAgent = req.headers['user-agent'];
      
      // Extract server name from path
      const pathParts = req.path.split('/');
      const mcpIndex = pathParts.findIndex((p: string) => p === 'mcp' || p === 'sse');
      const serverName = mcpIndex !== -1 && pathParts[mcpIndex + 1] ? pathParts[mcpIndex + 1] : 'unknown';
      
      const details = {
        serverName,
        group: req.params.group,
        queryParams: Object.keys(req.query),
        authenticationType: (req as any).tokenUser ? 'token' : ((req as any).user ? 'jwt' : 'anonymous'),
        token: (req as any).tokenUser ? (req as any).tokenUser.token : undefined
      };

      // Log the server access
      accessLogService.logAccess(
        username,
        action,
        resource,
        method,
        statusCode,
        ip,
        userAgent,
        duration,
        details
      );

      return originalSend.call(this, body);
    };

    next();
  };
}; 