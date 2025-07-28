import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import mcpUsageService, {
  UserAccessDetailsQuery,
  UserAccessDetailsResponse,
  McpUsageLog,
  PaginationInfo,
  AccessDetailsSummary
} from '../services/mcpUsageService';

interface UserAccessDashboardProps {
  onBack: () => void;
}

const UserAccessDashboard: React.FC<UserAccessDashboardProps> = ({ onBack }) => {
  const { t } = useTranslation();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserAccessDetailsResponse | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // 查询参数状态
  const [query, setQuery] = useState<UserAccessDetailsQuery>({
    page: 1,
    pageSize: 20,
    search: '',
    username: '',
    serverName: '',
    toolName: '',
    success: '',
    startDate: '',
    endDate: ''
  });

  // 获取数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await mcpUsageService.getUserAccessDetails(query);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [query]);

  // 初始加载和查询变化时重新加载
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 处理查询参数变化
  const handleQueryChange = (updates: Partial<UserAccessDetailsQuery>) => {
    setQuery(prev => ({
      ...prev,
      ...updates,
      page: updates.page !== undefined ? updates.page : 1 // 非分页变化时重置到第一页
    }));
  };

  // 处理分页变化
  const handlePageChange = (page: number) => {
    setQuery(prev => ({ ...prev, page }));
  };

  // 处理导出
  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      await mcpUsageService.exportUserAccessDetails(query, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  // 处理重置过滤器
  const handleResetFilters = () => {
    setQuery({
      page: 1,
      pageSize: 20,
      search: '',
      username: '',
      serverName: '',
      toolName: '',
      success: '',
      startDate: '',
      endDate: ''
    });
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 格式化状态
  const formatStatus = (success: boolean) => {
    return success ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        ✅ 成功
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        ❌ 失败
      </span>
    );
  };

  // 格式化持续时间
  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={onBack}
                className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ← 返回统计概览
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                👥 用户访问详情看板
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                查看所有用户的MCP服务访问详情，支持搜索、过滤和导出
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                📊 导出 CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={exporting}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                💾 导出 JSON
              </button>
            </div>
          </div>
        </div>

        {/* 汇总统计卡片 */}
        {data?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        用户数量
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {data.summary.uniqueUsers}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🔧</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        服务数量
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {data.summary.uniqueServers}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🛠️</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        工具数量
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {data.summary.uniqueTools}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        成功调用
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {data.summary.successCount}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">❌</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        失败调用
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {data.summary.failureCount}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        成功率
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {data.summary.successRate}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 搜索和过滤器 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* 搜索框 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                搜索
              </label>
              <input
                type="text"
                value={query.search || ''}
                onChange={(e) => handleQueryChange({ search: e.target.value })}
                placeholder="搜索用户、服务器、工具、IP等..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* 用户过滤 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                用户
              </label>
              <input
                type="text"
                value={query.username || ''}
                onChange={(e) => handleQueryChange({ username: e.target.value })}
                placeholder="过滤用户名..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* 服务器过滤 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                服务器
              </label>
              <input
                type="text"
                value={query.serverName || ''}
                onChange={(e) => handleQueryChange({ serverName: e.target.value })}
                placeholder="过滤服务器名..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* 工具过滤 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                工具
              </label>
              <input
                type="text"
                value={query.toolName || ''}
                onChange={(e) => handleQueryChange({ toolName: e.target.value })}
                placeholder="过滤工具名..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* 状态过滤 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                状态
              </label>
              <select
                value={query.success || ''}
                onChange={(e) => handleQueryChange({ success: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">所有状态</option>
                <option value="true">成功</option>
                <option value="false">失败</option>
              </select>
            </div>

            {/* 开始日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                开始日期
              </label>
              <input
                type="date"
                value={query.startDate || ''}
                onChange={(e) => handleQueryChange({ startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* 结束日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                结束日期
              </label>
              <input
                type="date"
                value={query.endDate || ''}
                onChange={(e) => handleQueryChange({ endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* 每页数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                每页显示
              </label>
              <select
                value={query.pageSize || 20}
                onChange={(e) => handleQueryChange({ pageSize: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value={10}>10条</option>
                <option value={20}>20条</option>
                <option value={50}>50条</option>
                <option value={100}>100条</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              🔄 重置过滤器
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  加载失败
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 数据表格 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">加载中...</span>
            </div>
          ) : data?.logs.length ? (
            <>
              {/* 表格 */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        用户
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
                        IP地址
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        详情
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {formatTime(log.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                          {log.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {log.serverName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          <span className="truncate max-w-xs" title={log.fullToolName}>
                            {log.toolName}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {formatStatus(log.success)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {formatDuration(log.duration)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {log.ip || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 max-w-xs">
                          <div className="truncate" title={log.errorMessage || JSON.stringify(log.arguments) || ''}>
                            {log.errorMessage || (log.arguments ? JSON.stringify(log.arguments) : 'N/A')}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页控件 */}
              {data.pagination && (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(data.pagination.page - 1)}
                      disabled={!data.pagination.hasPrevPage}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => handlePageChange(data.pagination.page + 1)}
                      disabled={!data.pagination.hasNextPage}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                      下一页
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        显示第{' '}
                        <span className="font-medium">{(data.pagination.page - 1) * data.pagination.pageSize + 1}</span>
                        {' '}到{' '}
                        <span className="font-medium">
                          {Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.totalCount)}
                        </span>
                        {' '}条，共{' '}
                        <span className="font-medium">{data.pagination.totalCount}</span>
                        {' '}条记录
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => handlePageChange(data.pagination.page - 1)}
                          disabled={!data.pagination.hasPrevPage}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                          上一页
                        </button>
                        
                        {/* 页码 */}
                        {[...Array(Math.min(5, data.pagination.totalPages))].map((_, index) => {
                          const pageNum = Math.max(1, data.pagination.page - 2) + index;
                          if (pageNum > data.pagination.totalPages) return null;
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNum === data.pagination.page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900 dark:border-blue-500 dark:text-blue-200'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => handlePageChange(data.pagination.page + 1)}
                          disabled={!data.pagination.hasNextPage}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                          下一页
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">📭</span>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                暂无数据
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                当前筛选条件下没有找到访问记录
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserAccessDashboard;
