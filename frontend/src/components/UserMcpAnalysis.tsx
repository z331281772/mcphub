import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import mcpUsageService, { UserMcpUsageStats, McpUsageLog } from '../services/mcpUsageService';

interface UserMcpAnalysisProps {
  username: string;
  onBack: () => void;
}

interface LogsTableProps {
  logs: McpUsageLog[];
  onServerClick?: (serverName: string) => void;
  onToolClick?: (toolName: string, serverName: string) => void;
}

const LogsTable: React.FC<LogsTableProps> = ({ logs, onServerClick, onToolClick }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          📋 最近调用记录
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                服务器
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                工具
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                耗时
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                详情
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => onServerClick?.(log.serverName)}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    🖥️ {log.serverName}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => onToolClick?.(log.toolName, log.serverName)}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    🔧 {log.toolName}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.success
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {log.success ? '✅ 成功' : '❌ 失败'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                  {log.duration ? `${log.duration}ms` : 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                  {log.errorMessage || (log.arguments ? JSON.stringify(log.arguments) : 'N/A')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const UserMcpAnalysis: React.FC<UserMcpAnalysisProps> = ({ username, onBack }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(30);
  const [data, setData] = useState<UserMcpUsageStats | null>(null);
  const [logs, setLogs] = useState<McpUsageLog[]>([]);

  const timeRangeOptions = mcpUsageService.getTimeRangeOptions();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 并行获取用户统计和日志
      const [userStats, userLogs] = await Promise.all([
        mcpUsageService.getUserUsageStats(username, timeRange),
        mcpUsageService.getUsageLogs({ username, limit: 50 })
      ]);
      
      setData(userStats);
      setLogs(userLogs.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [username, timeRange]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600 dark:text-gray-400">加载用户分析数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-400">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              加载失败
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>{error}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={fetchData}
                className="bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 px-3 py-2 rounded-md text-sm font-medium text-red-800 dark:text-red-200"
              >
                重试
              </button>
              <button
                onClick={onBack}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                返回
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← 返回概览
          </button>
          <div className="h-6 border-l border-gray-300 dark:border-gray-600"></div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            👤 {username} 的使用分析
          </h1>
        </div>
        
        {/* 时间范围选择器 */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            时间范围:
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="block w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 用户统计概览 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          📊 使用统计
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {data.totalCalls.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              总调用次数
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {data.mostUsedServers.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              使用的服务器
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {data.mostUsedTools.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              使用的工具
            </div>
          </div>
        </div>
      </div>

      {/* 服务器和工具使用排行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最常用服务器 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              🖥️ 最常用服务器
            </h3>
          </div>
          <div className="p-6">
            {data.mostUsedServers.length > 0 ? (
              <div className="space-y-4">
                {data.mostUsedServers.slice(0, 5).map((server, index) => {
                  const maxCount = data.mostUsedServers[0]?.count || 1;
                  const percentage = (server.count / maxCount) * 100;
                  
                  return (
                    <div key={server.serverName} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {index + 1}. {server.serverName}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {server.count} 次
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                暂无服务器使用记录
              </p>
            )}
          </div>
        </div>

        {/* 最常用工具 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              🔧 最常用工具
            </h3>
          </div>
          <div className="p-6">
            {data.mostUsedTools.length > 0 ? (
              <div className="space-y-4">
                {data.mostUsedTools.slice(0, 5).map((tool, index) => {
                  const maxCount = data.mostUsedTools[0]?.count || 1;
                  const percentage = (tool.count / maxCount) * 100;
                  
                  return (
                    <div key={`${tool.serverName}-${tool.toolName}`} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900 dark:text-white block truncate">
                            {index + 1}. {tool.toolName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {tool.serverName}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                          {tool.count} 次
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                暂无工具使用记录
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 使用日志表格 */}
      {logs.length > 0 && (
        <LogsTable logs={logs} />
      )}

      {/* 无数据提示 */}
      {data.totalCalls === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无使用数据
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            用户 "{username}" 在选定时间范围内没有MCP工具使用记录
          </p>
          <div className="mt-6">
            <button
              onClick={onBack}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              返回总览
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMcpAnalysis; 