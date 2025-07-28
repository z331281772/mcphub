import { getToken } from './authService';

// Helper function to get auth headers for regular API calls
const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'x-auth-token': token }),
  };
};

// Helper function to get auth headers for MCP API calls (supports both JWT and Bearer token)
const getMcpAuthHeaders = async (): Promise<Record<string, string>> => {
  const jwtToken = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!jwtToken) {
    return headers;
  }

  // Try to get current user info to extract access token
  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': jwtToken,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user && data.user.accessToken) {
        headers['Authorization'] = `Bearer ${data.user.accessToken}`;
        return headers;
      }
    }
  } catch (error) {
    console.warn('Failed to get user info, trying users API:', error);
  }

  // Fallback: try to get from admin users API (for admin users)
  try {
    const response = await fetch('/api/auth/users-with-tokens', {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': jwtToken,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        // Find current user's access token
        const currentUser = data.data.find((user: any) => user.accessToken);
        if (currentUser && currentUser.accessToken) {
          headers['Authorization'] = `Bearer ${currentUser.accessToken}`;
          return headers;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to get access token from users API, falling back to JWT:', error);
  }

  // Final fallback to JWT token (this might fail if requireMcpAuth is true)
  headers['x-auth-token'] = jwtToken;
  return headers;
};

// MCP使用日志接口
export interface McpUsageLog {
  id: string;
  timestamp: number;
  username: string;
  serverName: string;
  toolName: string;
  fullToolName: string;
  arguments?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  duration?: number;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  group?: string;
}

// MCP使用统计接口
export interface McpUsageStats {
  totalCalls: number;
  uniqueUsers: number;
  uniqueServers: number;
  uniqueTools: number;
  mostUsedServers: Array<{ serverName: string; count: number }>;
  mostUsedTools: Array<{ toolName: string; serverName: string; count: number }>;
  mostActiveUsers: Array<{ username: string; count: number }>;
  dailyUsage: Array<{ date: string; count: number }>;
  recentCalls: McpUsageLog[];
}

// 用户特定使用统计接口
export interface UserMcpUsageStats {
  totalCalls: number;
  mostUsedServers: Array<{ serverName: string; count: number }>;
  mostUsedTools: Array<{ toolName: string; serverName: string; count: number }>;
  recentCalls: McpUsageLog[];
}

// 使用日志查询参数
export interface McpUsageLogsQuery {
  limit?: number;
  username?: string;
  serverName?: string;
  toolName?: string;
}

// 用户访问详情查询参数接口
export interface UserAccessDetailsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  username?: string;
  serverName?: string;
  toolName?: string;
  success?: boolean | string;
  startDate?: string;
  endDate?: string;
}

// 分页信息接口
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// 访问详情汇总信息接口
export interface AccessDetailsSummary {
  uniqueUsers: number;
  uniqueServers: number;
  uniqueTools: number;
  successCount: number;
  failureCount: number;
  successRate: number;
}

// 用户访问详情响应接口
export interface UserAccessDetailsResponse {
  logs: McpUsageLog[];
  pagination: PaginationInfo;
  filters: {
    searchTerm?: string;
    username?: string;
    serverName?: string;
    toolName?: string;
    success?: string;
    startDate?: string;
    endDate?: string;
  };
  summary: AccessDetailsSummary;
}

class McpUsageService {
  private baseUrl = '/api/mcp-usage';

  /**
   * 获取MCP使用统计
   */
  async getUsageStats(days: number = 30): Promise<McpUsageStats> {
    const headers = await getMcpAuthHeaders();
    const response = await fetch(`${this.baseUrl}/stats?days=${days}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch usage stats: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch usage stats');
    }

    return data.data;
  }

  /**
   * 获取MCP使用概览
   */
  async getUsageOverview(days: number = 7): Promise<{
    summary: {
      totalCalls: number;
      uniqueUsers: number;
      uniqueServers: number;
      uniqueTools: number;
    };
    topServers: Array<{ serverName: string; count: number }>;
    topTools: Array<{ toolName: string; serverName: string; count: number }>;
    topUsers: Array<{ username: string; count: number }>;
    dailyTrend: Array<{ date: string; count: number }>;
  }> {
    const headers = await getMcpAuthHeaders();
    const response = await fetch(`${this.baseUrl}/overview?days=${days}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch usage overview: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch usage overview');
    }

    return data.data;
  }

  /**
   * 获取特定用户的MCP使用统计
   */
  async getUserUsageStats(username: string, days: number = 30): Promise<UserMcpUsageStats> {
    const headers = await getMcpAuthHeaders();
    const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(username)}?days=${days}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user usage stats: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch user usage stats');
    }

    return data.data;
  }

  /**
   * 获取MCP使用日志
   */
  async getUsageLogs(query: McpUsageLogsQuery = {}): Promise<{
    logs: McpUsageLog[];
    total: number;
    filtered: number;
  }> {
    const params = new URLSearchParams();
    
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.username) params.append('username', query.username);
    if (query.serverName) params.append('serverName', query.serverName);
    if (query.toolName) params.append('toolName', query.toolName);

    const headers = await getMcpAuthHeaders();
    const response = await fetch(`${this.baseUrl}/logs?${params.toString()}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch usage logs: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch usage logs');
    }

    return data.data;
  }

  /**
   * 清空MCP使用日志
   */
  async clearUsageLogs(): Promise<void> {
    const headers = await getMcpAuthHeaders();
    const response = await fetch(`${this.baseUrl}/logs`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to clear usage logs: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to clear usage logs');
    }
  }

  /**
   * 获取用户访问详情 - 支持分页和搜索
   */
  async getUserAccessDetails(query: UserAccessDetailsQuery = {}): Promise<UserAccessDetailsResponse> {
    const params = new URLSearchParams();
    
    if (query.page) params.append('page', query.page.toString());
    if (query.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query.search) params.append('search', query.search);
    if (query.username) params.append('username', query.username);
    if (query.serverName) params.append('serverName', query.serverName);
    if (query.toolName) params.append('toolName', query.toolName);
    if (query.success !== undefined && query.success !== '') {
      params.append('success', query.success.toString());
    }
    if (query.startDate) params.append('startDate', query.startDate);
    if (query.endDate) params.append('endDate', query.endDate);

    const headers = await getMcpAuthHeaders();
    const response = await fetch(`${this.baseUrl}/access-details?${params.toString()}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user access details: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch user access details');
    }

    return data.data;
  }

  /**
   * 导出用户访问详情
   */
  async exportUserAccessDetails(
    query: UserAccessDetailsQuery = {},
    format: 'csv' | 'json' = 'csv'
  ): Promise<void> {
    const params = new URLSearchParams();
    
    params.append('format', format);
    if (query.search) params.append('search', query.search);
    if (query.username) params.append('username', query.username);
    if (query.serverName) params.append('serverName', query.serverName);
    if (query.toolName) params.append('toolName', query.toolName);
    if (query.success !== undefined && query.success !== '') {
      params.append('success', query.success.toString());
    }
    if (query.startDate) params.append('startDate', query.startDate);
    if (query.endDate) params.append('endDate', query.endDate);

    const headers = await getMcpAuthHeaders();
    const response = await fetch(`${this.baseUrl}/export?${params.toString()}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to export user access details: ${response.statusText}`);
    }

    // 如果是CSV或JSON格式，触发下载
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `mcp-user-access-details-${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.${format}`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * 获取用户列表（从使用统计中提取）
   */
  async getActiveUsers(days: number = 30): Promise<Array<{ username: string; count: number }>> {
    const stats = await this.getUsageStats(days);
    return stats.mostActiveUsers;
  }

  /**
   * 获取服务器列表（从使用统计中提取）
   */
  async getActiveServers(days: number = 30): Promise<Array<{ serverName: string; count: number }>> {
    const stats = await this.getUsageStats(days);
    return stats.mostUsedServers;
  }

  /**
   * 获取工具列表（从使用统计中提取）
   */
  async getActiveTools(days: number = 30): Promise<Array<{ toolName: string; serverName: string; count: number }>> {
    const stats = await this.getUsageStats(days);
    return stats.mostUsedTools;
  }

  /**
   * 格式化使用日志为显示用的数据
   */
  formatUsageLogForDisplay(log: McpUsageLog): {
    id: string;
    time: string;
    user: string;
    server: string;
    tool: string;
    status: 'success' | 'error';
    duration: string;
    details: string;
  } {
    return {
      id: log.id,
      time: new Date(log.timestamp).toLocaleString(),
      user: log.username,
      server: log.serverName,
      tool: log.toolName,
      status: log.success ? 'success' : 'error',
      duration: log.duration ? `${log.duration}ms` : 'N/A',
      details: log.errorMessage || (log.arguments ? JSON.stringify(log.arguments) : 'N/A'),
    };
  }

  /**
   * 获取时间范围选项
   */
  getTimeRangeOptions(): Array<{ label: string; value: number }> {
    return [
      { label: '最近1天', value: 1 },
      { label: '最近3天', value: 3 },
      { label: '最近7天', value: 7 },
      { label: '最近15天', value: 15 },
      { label: '最近30天', value: 30 },
      { label: '最近90天', value: 90 },
    ];
  }
}

export const mcpUsageService = new McpUsageService();
export default mcpUsageService;
