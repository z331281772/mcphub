import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IAccessLog } from '../types/index.js';

class AccessLogService {
  private logsFilePath: string;
  private maxLogEntries: number = 10000; // Maximum number of log entries to keep

  constructor() {
    // Create access_logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'access_logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    this.logsFilePath = path.join(logsDir, 'access_logs.json');
    
    // Initialize file if it doesn't exist
    if (!fs.existsSync(this.logsFilePath)) {
      this.saveLogs([]);
    }
  }

  // Load logs from file
  private loadLogs(): IAccessLog[] {
    try {
      const data = fs.readFileSync(this.logsFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading access logs:', error);
      return [];
    }
  }

  // Save logs to file
  private saveLogs(logs: IAccessLog[]): void {
    try {
      fs.writeFileSync(this.logsFilePath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Error saving access logs:', error);
    }
  }

  // Log an access event
  logAccess(
    username: string,
    action: string,
    resource: string,
    method: string,
    statusCode: number,
    ip: string,
    userAgent?: string,
    duration?: number,
    details?: any
  ): void {
    const logs = this.loadLogs();
    
    const logEntry: IAccessLog = {
      id: uuidv4(),
      username,
      action,
      resource,
      method,
      statusCode,
      ip,
      userAgent,
      timestamp: Date.now(),
      duration,
      details
    };

    logs.push(logEntry);

    // Keep only the most recent logs
    if (logs.length > this.maxLogEntries) {
      logs.splice(0, logs.length - this.maxLogEntries);
    }

    this.saveLogs(logs);
  }

  // Get logs with filtering and pagination
  getLogs(
    limit?: number,
    offset?: number,
    username?: string,
    startDate?: number,
    endDate?: number
  ): { logs: IAccessLog[]; total: number } {
    let logs = this.loadLogs();

    // Filter by username
    if (username) {
      logs = logs.filter(log => log.username === username);
    }

    // Filter by date range
    if (startDate) {
      logs = logs.filter(log => log.timestamp >= startDate);
    }
    if (endDate) {
      logs = logs.filter(log => log.timestamp <= endDate);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp - a.timestamp);

    const total = logs.length;

    // Apply pagination
    if (offset !== undefined) {
      logs = logs.slice(offset);
    }
    if (limit !== undefined) {
      logs = logs.slice(0, limit);
    }

    return { logs, total };
  }

  // Get system overview statistics
  getSystemOverview(): any {
    const logs = this.loadLogs();
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);
    const last7Days = now - (7 * 24 * 60 * 60 * 1000);

    // Recent logs
    const recentLogs = logs.filter(log => log.timestamp >= last24Hours);
    const weeklyLogs = logs.filter(log => log.timestamp >= last7Days);

    // User activity
    const activeUsers = new Set(recentLogs.map(log => log.username));
    const totalUsers = new Set(logs.map(log => log.username));

    // Most active users
    const userActivity: Record<string, number> = {};
    recentLogs.forEach(log => {
      userActivity[log.username] = (userActivity[log.username] || 0) + 1;
    });

    const mostActiveUsers = Object.entries(userActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([username, count]) => ({ username, count }));

    // Most used actions
    const actionCounts: Record<string, number> = {};
    recentLogs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    const mostUsedActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    // Error rate
    const errorLogs = recentLogs.filter(log => log.statusCode >= 400);
    const errorRate = recentLogs.length > 0 ? (errorLogs.length / recentLogs.length) * 100 : 0;

    // Average response time
    const logsWithDuration = recentLogs.filter(log => log.duration !== undefined);
    const avgResponseTime = logsWithDuration.length > 0 
      ? logsWithDuration.reduce((sum, log) => sum + (log.duration || 0), 0) / logsWithDuration.length
      : 0;

    return {
      totalLogs: logs.length,
      recentActivity: {
        last24Hours: recentLogs.length,
        last7Days: weeklyLogs.length,
      },
      users: {
        active: activeUsers.size,
        total: totalUsers.size,
        mostActive: mostActiveUsers,
      },
      actions: {
        mostUsed: mostUsedActions,
      },
      performance: {
        errorRate: parseFloat(errorRate.toFixed(2)),
        avgResponseTime: parseFloat(avgResponseTime.toFixed(2)),
      },
    };
  }

  // Clean old logs
  cleanOldLogs(beforeTimestamp: number): number {
    const logs = this.loadLogs();
    const originalLength = logs.length;
    
    const filteredLogs = logs.filter(log => log.timestamp >= beforeTimestamp);
    this.saveLogs(filteredLogs);
    
    return originalLength - filteredLogs.length;
  }

  // Clear all logs
  clearAllLogs(): void {
    this.saveLogs([]);
  }

  // Get user statistics
  getUserStatistics(username: string): any {
    const logs = this.loadLogs().filter(log => log.username === username);
    const now = Date.now();
    const last30Days = now - (30 * 24 * 60 * 60 * 1000);

    const recentLogs = logs.filter(log => log.timestamp >= last30Days);

    // Server usage
    const serverUsage: Record<string, number> = {};
    recentLogs.forEach(log => {
      if (log.details && log.details.serverName) {
        serverUsage[log.details.serverName] = (serverUsage[log.details.serverName] || 0) + 1;
      }
    });

    const mostUsedServers = Object.entries(serverUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([serverName, count]) => ({ serverName, count }));

    // Tool usage
    const toolUsage: Record<string, { count: number; serverName: string }> = {};
    recentLogs.forEach(log => {
      if (log.details && log.details.toolName) {
        const key = log.details.toolName;
        if (!toolUsage[key]) {
          toolUsage[key] = { count: 0, serverName: log.details.serverName || 'unknown' };
        }
        toolUsage[key].count++;
      }
    });

    const mostUsedTools = Object.entries(toolUsage)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([toolName, data]) => ({ 
        toolName, 
        serverName: data.serverName, 
        count: data.count 
      }));

    // Daily activity
    const dailyActivity: Record<string, number> = {};
    recentLogs.forEach(log => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    const dailyStats = Object.entries(dailyActivity)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, requests]) => ({ date, requests }));

    // Last activity
    const lastActivity = logs.length > 0 ? Math.max(...logs.map(log => log.timestamp)) : undefined;
    const lastLogin = logs.filter(log => log.action === 'login').slice(-1)[0]?.timestamp;

    return {
      username,
      totalRequests: logs.length,
      recentRequests: recentLogs.length,
      lastLoginAt: lastLogin,
      lastActivity,
      mostUsedServers,
      mostUsedTools,
      dailyStats,
    };
  }
}

// Create and export a singleton instance
const accessLogService = new AccessLogService();
export default accessLogService; 