import { getApiUrl } from '../utils/runtime';
import { getToken } from './authService';
import { ApiResponse } from './userService';

export interface AccessLog {
  id: string;
  username: string;
  action: string;
  resource: string;
  method: string;
  statusCode: number;
  ip: string;
  userAgent?: string;
  timestamp: number;
  duration?: number;
  details?: any;
}

export interface UserStatistics {
  username: string;
  totalRequests: number;
  lastLoginAt?: number;
  lastActivity?: number;
  mostUsedServers: Array<{ name: string; count: number }>;
  mostUsedTools: Array<{ name: string; count: number }>;
  dailyStats: Array<{ date: string; requests: number }>;
}

export interface SystemOverview {
  totalLogs: number;
  totalUsers: number;
  activeUsers: number;
  totalRequests: number;
  avgResponseTime: number;
  topServers: Array<{ name: string; count: number }>;
  topUsers: Array<{ username: string; requests: number }>;
  recentActivity: AccessLog[];
}

export interface AccessLogParams {
  limit?: number;
  offset?: number;
  username?: string;
  startDate?: number;
  endDate?: number;
  action?: string;
  resource?: string;
  method?: string;
  statusCode?: number;
}

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'x-auth-token': token }),
      ...options.headers,
    },
  });
};

// Get access logs with optional filtering
export const getAccessLogs = async (params: AccessLogParams = {}): Promise<AccessLog[]> => {
  try {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });
    
    const url = `${getApiUrl('/access-logs')}?${searchParams.toString()}`;
    const response = await makeAuthenticatedRequest(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch access logs');
    }
    
    const data: ApiResponse<AccessLog[]> = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching access logs:', error);
    throw error;
  }
};

// Get user statistics
export const getUserStatistics = async (username: string): Promise<UserStatistics> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl(`/auth/users/${username}/statistics`));
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch user statistics');
    }
    
    const data: ApiResponse<UserStatistics> = await response.json();
    return data.data || {
      username,
      totalRequests: 0,
      mostUsedServers: [],
      mostUsedTools: [],
      dailyStats: [],
    };
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw error;
  }
};

// Get system overview
export const getSystemOverview = async (): Promise<SystemOverview> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl('/access-logs/overview'));
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch system overview');
    }
    
    const data: ApiResponse<SystemOverview> = await response.json();
    return data.data || {
      totalLogs: 0,
      totalUsers: 0,
      activeUsers: 0,
      totalRequests: 0,
      avgResponseTime: 0,
      topServers: [],
      topUsers: [],
      recentActivity: [],
    };
  } catch (error) {
    console.error('Error fetching system overview:', error);
    throw error;
  }
};

// Export logs as file
export const exportLogs = async (format: 'csv' | 'json', params: AccessLogParams = {}): Promise<Blob> => {
  try {
    const searchParams = new URLSearchParams();
    searchParams.append('format', format);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });
    
    const url = `${getApiUrl('/access-logs/export')}?${searchParams.toString()}`;
    const response = await makeAuthenticatedRequest(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to export logs');
    }
    
    return await response.blob();
  } catch (error) {
    console.error('Error exporting logs:', error);
    throw error;
  }
};

// Clean old logs (admin only)
export const cleanOldLogs = async (beforeTimestamp: number): Promise<number> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl('/access-logs'), {
      method: 'DELETE',
      body: JSON.stringify({ beforeTimestamp }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to clean old logs');
    }
    
    const data: ApiResponse<{ deletedCount: number }> = await response.json();
    return data.data?.deletedCount || 0;
  } catch (error) {
    console.error('Error cleaning old logs:', error);
    throw error;
  }
};

// Clear all logs (admin only)
export const clearAllLogs = async (): Promise<void> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl('/access-logs/clear'), {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to clear all logs');
    }
  } catch (error) {
    console.error('Error clearing all logs:', error);
    throw error;
  }
};

// Utility functions
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

export const formatDuration = (duration?: number): string => {
  if (!duration) return 'N/A';
  if (duration < 1000) return `${duration}ms`;
  return `${(duration / 1000).toFixed(2)}s`;
};

export const getStatusColor = (statusCode: number): string => {
  if (statusCode >= 200 && statusCode < 300) return 'text-green-600';
  if (statusCode >= 300 && statusCode < 400) return 'text-blue-600';
  if (statusCode >= 400 && statusCode < 500) return 'text-yellow-600';
  if (statusCode >= 500) return 'text-red-600';
  return 'text-gray-600';
};

export const getActionTypeColor = (action: string): string => {
  const actionMap: Record<string, string> = {
    'login': 'text-blue-600',
    'logout': 'text-gray-600',
    'api_access': 'text-green-600',
    'mcp_access': 'text-purple-600',
    'tool_call': 'text-orange-600',
    'user_registration': 'text-blue-600',
    'user_update': 'text-yellow-600',
    'user_delete': 'text-red-600',
    'token_generate': 'text-indigo-600',
    'token_revoke': 'text-red-600',
  };
  
  return actionMap[action] || 'text-gray-600';
}; 