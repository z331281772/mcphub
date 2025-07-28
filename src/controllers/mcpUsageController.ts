import { Request, Response } from 'express';
import mcpUsageLogger from '../services/mcpUsageLogger.js';
import { ApiResponse } from '../types/index.js';

/**
 * 获取MCP使用统计
 */
export const getMcpUsageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const stats = mcpUsageLogger.getUsageStats(days);
    
    const response: ApiResponse = {
      success: true,
      data: stats,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting MCP usage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get MCP usage statistics',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

/**
 * 获取特定用户的MCP使用统计
 */
export const getUserMcpUsageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    
    if (!username) {
      res.status(400).json({
        success: false,
        message: 'Username is required',
      });
      return;
    }
    
    const stats = mcpUsageLogger.getUserUsageStats(username, days);
    
    const response: ApiResponse = {
      success: true,
      data: stats,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting user MCP usage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user MCP usage statistics',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

/**
 * 获取MCP使用日志
 */
export const getMcpUsageLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const username = req.query.username as string;
    const serverName = req.query.serverName as string;
    const toolName = req.query.toolName as string;
    
    let logs = mcpUsageLogger.getAllLogs();
    
    // 过滤条件
    if (username) {
      logs = logs.filter(log => log.username === username);
    }
    
    if (serverName) {
      logs = logs.filter(log => log.serverName === serverName);
    }
    
    if (toolName) {
      logs = logs.filter(log => log.toolName === toolName);
    }
    
    // 按时间倒序排列，取最新的记录
    const sortedLogs = logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    
    const response: ApiResponse = {
      success: true,
      data: {
        logs: sortedLogs,
        total: logs.length,
        filtered: sortedLogs.length
      },
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting MCP usage logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get MCP usage logs',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

/**
 * 获取用户访问详情 - 支持分页和搜索
 */
export const getUserAccessDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const searchTerm = req.query.search as string || '';
    const username = req.query.username as string;
    const serverName = req.query.serverName as string;
    const toolName = req.query.toolName as string;
    const success = req.query.success as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    let logs = mcpUsageLogger.getAllLogs();
    
    // 搜索过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      logs = logs.filter(log => 
        log.username.toLowerCase().includes(searchLower) ||
        log.serverName.toLowerCase().includes(searchLower) ||
        log.toolName.toLowerCase().includes(searchLower) ||
        log.fullToolName.toLowerCase().includes(searchLower) ||
        (log.errorMessage && log.errorMessage.toLowerCase().includes(searchLower)) ||
        log.ip?.toLowerCase().includes(searchLower) ||
        log.userAgent?.toLowerCase().includes(searchLower)
      );
    }
    
    // 其他过滤条件
    if (username) {
      logs = logs.filter(log => log.username === username);
    }
    
    if (serverName) {
      logs = logs.filter(log => log.serverName === serverName);
    }
    
    if (toolName) {
      logs = logs.filter(log => log.toolName.includes(toolName) || log.fullToolName.includes(toolName));
    }
    
    if (success !== undefined && success !== '') {
      const isSuccess = success === 'true';
      logs = logs.filter(log => log.success === isSuccess);
    }
    
    // 日期范围过滤
    if (startDate) {
      const startTimestamp = new Date(startDate).getTime();
      logs = logs.filter(log => log.timestamp >= startTimestamp);
    }
    
    if (endDate) {
      const endTimestamp = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1; // 包含整天
      logs = logs.filter(log => log.timestamp <= endTimestamp);
    }
    
    // 按时间倒序排列
    const sortedLogs = logs.sort((a, b) => b.timestamp - a.timestamp);
    
    // 分页
    const totalCount = sortedLogs.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedLogs = sortedLogs.slice(startIndex, endIndex);
    
    // 统计信息
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // 计算一些汇总统计
    const uniqueUsers = new Set(sortedLogs.map(log => log.username)).size;
    const uniqueServers = new Set(sortedLogs.map(log => log.serverName)).size;
    const uniqueTools = new Set(sortedLogs.map(log => log.fullToolName)).size;
    const successCount = sortedLogs.filter(log => log.success).length;
    const failureCount = sortedLogs.filter(log => !log.success).length;
    
    const response: ApiResponse = {
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          searchTerm,
          username,
          serverName,
          toolName,
          success,
          startDate,
          endDate
        },
        summary: {
          uniqueUsers,
          uniqueServers,
          uniqueTools,
          successCount,
          failureCount,
          successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0
        }
      },
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting user access details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user access details',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

/**
 * 导出用户访问详情数据
 */
export const exportUserAccessDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const format = req.query.format as string || 'csv';
    const searchTerm = req.query.search as string || '';
    const username = req.query.username as string;
    const serverName = req.query.serverName as string;
    const toolName = req.query.toolName as string;
    const success = req.query.success as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    let logs = mcpUsageLogger.getAllLogs();
    
    // 应用相同的过滤逻辑
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      logs = logs.filter(log => 
        log.username.toLowerCase().includes(searchLower) ||
        log.serverName.toLowerCase().includes(searchLower) ||
        log.toolName.toLowerCase().includes(searchLower) ||
        log.fullToolName.toLowerCase().includes(searchLower) ||
        (log.errorMessage && log.errorMessage.toLowerCase().includes(searchLower)) ||
        log.ip?.toLowerCase().includes(searchLower) ||
        log.userAgent?.toLowerCase().includes(searchLower)
      );
    }
    
    if (username) logs = logs.filter(log => log.username === username);
    if (serverName) logs = logs.filter(log => log.serverName === serverName);
    if (toolName) logs = logs.filter(log => log.toolName.includes(toolName) || log.fullToolName.includes(toolName));
    if (success !== undefined && success !== '') {
      const isSuccess = success === 'true';
      logs = logs.filter(log => log.success === isSuccess);
    }
    if (startDate) {
      const startTimestamp = new Date(startDate).getTime();
      logs = logs.filter(log => log.timestamp >= startTimestamp);
    }
    if (endDate) {
      const endTimestamp = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
      logs = logs.filter(log => log.timestamp <= endTimestamp);
    }
    
    // 按时间倒序排列
    const sortedLogs = logs.sort((a, b) => b.timestamp - a.timestamp);
    
    if (format === 'csv') {
      // 生成CSV
      const csvHeaders = [
        'Timestamp',
        'Date',
        'Username',
        'Server Name',
        'Tool Name',
        'Full Tool Name',
        'Success',
        'Duration (ms)',
        'IP Address',
        'User Agent',
        'Session ID',
        'Arguments',
        'Error Message'
      ];
      
      const csvRows = sortedLogs.map(log => [
        log.timestamp.toString(),
        new Date(log.timestamp).toISOString(),
        log.username,
        log.serverName,
        log.toolName,
        log.fullToolName,
        log.success ? 'Success' : 'Failed',
        log.duration?.toString() || '',
        log.ip || '',
        log.userAgent || '',
        log.sessionId || '',
        JSON.stringify(log.arguments || {}),
        log.errorMessage || ''
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = `mcp-user-access-details-${timestamp}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } else if (format === 'json') {
      // 生成JSON
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = `mcp-user-access-details-${timestamp}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json({
        exportedAt: new Date().toISOString(),
        totalRecords: sortedLogs.length,
        filters: {
          searchTerm,
          username,
          serverName,
          toolName,
          success,
          startDate,
          endDate
        },
        data: sortedLogs
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Unsupported export format. Use "csv" or "json".'
      });
    }
  } catch (error) {
    console.error('Error exporting user access details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export user access details',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

/**
 * 清空MCP使用日志
 */
export const clearMcpUsageLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    mcpUsageLogger.clearLogs();
    
    const response: ApiResponse = {
      success: true,
      message: 'MCP usage logs cleared successfully',
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error clearing MCP usage logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear MCP usage logs',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

/**
 * 获取MCP使用概览
 */
export const getMcpUsageOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const stats = mcpUsageLogger.getUsageStats(days);
    
    // 简化的概览数据
    const overview = {
      summary: {
        totalCalls: stats.totalCalls,
        uniqueUsers: stats.uniqueUsers,
        uniqueServers: stats.uniqueServers,
        uniqueTools: stats.uniqueTools
      },
      topServers: stats.mostUsedServers.slice(0, 5),
      topTools: stats.mostUsedTools.slice(0, 5),
      topUsers: stats.mostActiveUsers.slice(0, 5),
      dailyTrend: stats.dailyUsage
    };
    
    const response: ApiResponse = {
      success: true,
      data: overview,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting MCP usage overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get MCP usage overview',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};
