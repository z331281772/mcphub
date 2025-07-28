import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MCP工具使用记录接口
export interface McpUsageLog {
  id: string;
  timestamp: number;
  username: string;
  serverName: string;
  toolName: string;
  fullToolName: string; // 包含服务器前缀的完整工具名
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

class McpUsageLoggerService {
  private logsDir: string;
  private logFile: string;
  private logs: McpUsageLog[] = [];

  constructor() {
    // 设置日志目录和文件
    this.logsDir = path.resolve(path.dirname(__dirname), '../mcp_usage_logs');
    this.logFile = path.join(this.logsDir, 'mcp_usage.json');
    
    // 确保目录存在
    this.ensureDirectoryExists();
    
    // 加载现有日志
    this.loadLogs();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        const data = fs.readFileSync(this.logFile, 'utf-8');
        this.logs = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading MCP usage logs:', error);
      this.logs = [];
    }
  }

  private saveLogs(): void {
    try {
      fs.writeFileSync(this.logFile, JSON.stringify(this.logs, null, 2));
    } catch (error) {
      console.error('Error saving MCP usage logs:', error);
    }
  }

  /**
   * 记录MCP工具调用
   */
  public logToolCall(
    username: string,
    serverName: string,
    toolName: string,
    success: boolean,
    options: {
      arguments?: Record<string, any>;
      errorMessage?: string;
      duration?: number;
      ip?: string;
      userAgent?: string;
      sessionId?: string;
      group?: string;
    } = {}
  ): void {
    const logEntry: McpUsageLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      username,
      serverName,
      toolName,
      fullToolName: `${serverName}/${toolName}`,
      success,
      ...options
    };

    this.logs.push(logEntry);
    
    // 定期清理旧日志，保留最近30天的记录
    this.cleanOldLogs();
    
    // 保存到文件
    this.saveLogs();

    console.log(`[MCP Usage] ${username} -> ${serverName}/${toolName} (${success ? 'SUCCESS' : 'FAILED'})`);
  }

  /**
   * 获取使用统计
   */
  public getUsageStats(days: number = 30): McpUsageStats {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => log.timestamp >= cutoffTime);

    // 服务器使用统计
    const serverCounts = new Map<string, number>();
    recentLogs.forEach(log => {
      const count = serverCounts.get(log.serverName) || 0;
      serverCounts.set(log.serverName, count + 1);
    });

    // 工具使用统计
    const toolCounts = new Map<string, { count: number; serverName: string }>();
    recentLogs.forEach(log => {
      const key = log.fullToolName;
      const current = toolCounts.get(key) || { count: 0, serverName: log.serverName };
      toolCounts.set(key, { count: current.count + 1, serverName: log.serverName });
    });

    // 用户活跃统计
    const userCounts = new Map<string, number>();
    recentLogs.forEach(log => {
      const count = userCounts.get(log.username) || 0;
      userCounts.set(log.username, count + 1);
    });

    // 每日使用统计
    const dailyUsage = new Map<string, number>();
    recentLogs.forEach(log => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      const count = dailyUsage.get(date) || 0;
      dailyUsage.set(date, count + 1);
    });

    return {
      totalCalls: recentLogs.length,
      uniqueUsers: userCounts.size,
      uniqueServers: serverCounts.size,
      uniqueTools: toolCounts.size,
      mostUsedServers: Array.from(serverCounts.entries())
        .map(([serverName, count]) => ({ serverName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      mostUsedTools: Array.from(toolCounts.entries())
        .map(([toolName, data]) => ({ toolName, serverName: data.serverName, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      mostActiveUsers: Array.from(userCounts.entries())
        .map(([username, count]) => ({ username, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      dailyUsage: Array.from(dailyUsage.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      recentCalls: recentLogs.slice(-50).reverse() // 最近50次调用
    };
  }

  /**
   * 获取特定用户的使用统计
   */
  public getUserUsageStats(username: string, days: number = 30): Partial<McpUsageStats> {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const userLogs = this.logs.filter(log => 
      log.username === username && log.timestamp >= cutoffTime
    );

    // 该用户的服务器使用统计
    const serverCounts = new Map<string, number>();
    userLogs.forEach(log => {
      const count = serverCounts.get(log.serverName) || 0;
      serverCounts.set(log.serverName, count + 1);
    });

    // 该用户的工具使用统计
    const toolCounts = new Map<string, { count: number; serverName: string }>();
    userLogs.forEach(log => {
      const key = log.fullToolName;
      const current = toolCounts.get(key) || { count: 0, serverName: log.serverName };
      toolCounts.set(key, { count: current.count + 1, serverName: log.serverName });
    });

    return {
      totalCalls: userLogs.length,
      mostUsedServers: Array.from(serverCounts.entries())
        .map(([serverName, count]) => ({ serverName, count }))
        .sort((a, b) => b.count - a.count),
      mostUsedTools: Array.from(toolCounts.entries())
        .map(([toolName, data]) => ({ toolName, serverName: data.serverName, count: data.count }))
        .sort((a, b) => b.count - a.count),
      recentCalls: userLogs.slice(-20).reverse() // 最近20次调用
    };
  }

  /**
   * 清理旧日志
   */
  private cleanOldLogs(): void {
    const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 保留30天
    const originalLength = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp >= cutoffTime);
    
    if (this.logs.length < originalLength) {
      console.log(`Cleaned ${originalLength - this.logs.length} old MCP usage logs`);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * 获取所有日志
   */
  public getAllLogs(): McpUsageLog[] {
    return [...this.logs];
  }

  /**
   * 清空所有日志
   */
  public clearLogs(): void {
    this.logs = [];
    this.saveLogs();
    console.log('All MCP usage logs cleared');
  }
}

// 导出单例实例
export const mcpUsageLogger = new McpUsageLoggerService();
export default mcpUsageLogger; 