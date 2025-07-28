import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import mcpUsageService from '../services/mcpUsageService';

interface McpUsageOverviewProps {
  onUserClick?: (username: string) => void;
  onServerClick?: (serverName: string) => void;
  onToolClick?: (toolName: string, serverName: string) => void;
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: string;
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'indigo';
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon,
  color = 'blue' 
}) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-100',
    green: 'bg-green-500 text-green-100',
    purple: 'bg-purple-500 text-purple-100',
    yellow: 'bg-yellow-500 text-yellow-100',
    red: 'bg-red-500 text-red-100',
    indigo: 'bg-indigo-500 text-indigo-100',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center">
        {icon && (
          <div className={`flex-shrink-0 p-3 rounded-lg ${colorClasses[color]}`}>
            <span className="text-xl">{icon}</span>
          </div>
        )}
        <div className={`${icon ? 'ml-4' : ''} flex-1`}>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );
};

interface RankingTableProps {
  title: string;
  icon: string;
  data: Array<any>;
  columns: {
    key: string;
    label: string;
    render?: (value: any, item: any, index: number) => React.ReactNode;
  }[];
  rowKey: string | ((item: any) => string);
}

const RankingTable: React.FC<RankingTableProps> = ({ 
  title, 
  icon, 
  data, 
  columns, 
  rowKey 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <span className="text-lg mr-2">{icon}</span>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.slice(0, 5).map((item, index) => (
              <tr key={typeof rowKey === 'string' ? item[rowKey] : rowKey(item)}>
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                    {column.render ? column.render(item[column.key], item, index) : item[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const colors = {
    1: 'bg-yellow-400 text-yellow-900',
    2: 'bg-gray-300 text-gray-900',
    3: 'bg-yellow-600 text-white',
  };
  
  const color = colors[rank as keyof typeof colors] || 'bg-gray-200 text-gray-700';
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      #{rank}
    </span>
  );
};

const McpUsageOverview: React.FC<McpUsageOverviewProps> = ({
  onUserClick,
  onServerClick,
  onToolClick,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(7);
  const [data, setData] = useState<any>(null);

  const timeRangeOptions = mcpUsageService.getTimeRangeOptions();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const overview = await mcpUsageService.getUsageOverview(timeRange);
      setData(overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600 dark:text-gray-400">加载MCP使用统计...</p>
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
            <div className="mt-4">
              <button
                onClick={fetchData}
                className="bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 px-3 py-2 rounded-md text-sm font-medium text-red-800 dark:text-red-200"
              >
                重试
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

  // 定义表格列
  const serverColumns = [
    {
      key: 'rank',
      label: '排名',
      render: (_: any, item: any, index: number) => <RankBadge rank={index + 1} />,
    },
    {
      key: 'serverName',
      label: '服务器',
      render: (value: string) => (
        <button
          onClick={() => onServerClick?.(value)}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          🖥️ {value}
        </button>
      ),
    },
    {
      key: 'count',
      label: '调用次数',
      render: (value: number) => (
        <span className="font-mono text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </span>
      ),
    },
  ];

  const toolColumns = [
    {
      key: 'rank',
      label: '排名',
      render: (_: any, item: any, index: number) => <RankBadge rank={index + 1} />,
    },
    {
      key: 'toolName',
      label: '工具',
      render: (value: string, item: any) => (
        <button
          onClick={() => onToolClick?.(value, item.serverName)}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          🔧 {value}
        </button>
      ),
    },
    {
      key: 'serverName',
      label: '服务器',
      render: (value: string) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {value}
        </span>
      ),
    },
    {
      key: 'count',
      label: '调用次数',
      render: (value: number) => (
        <span className="font-mono text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </span>
      ),
    },
  ];

  const userColumns = [
    {
      key: 'rank',
      label: '排名',
      render: (_: any, item: any, index: number) => <RankBadge rank={index + 1} />,
    },
    {
      key: 'username',
      label: '用户',
      render: (value: string) => (
        <button
          onClick={() => onUserClick?.(value)}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          👤 {value}
        </button>
      ),
    },
    {
      key: 'count',
      label: '调用次数',
      render: (value: number) => (
        <span className="font-mono text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
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

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="总调用次数"
          value={data.summary.totalCalls}
          icon="📊"
          color="green"
        />
        <StatsCard
          title="活跃用户"
          value={data.summary.uniqueUsers}
          icon="👥"
          color="red"
        />
        <StatsCard
          title="使用的服务器"
          value={data.summary.uniqueServers}
          icon="🖥️"
          color="blue"
        />
        <StatsCard
          title="使用的工具"
          value={data.summary.uniqueTools}
          icon="🔧"
          color="purple"
        />
      </div>

      {/* 使用趋势图表 */}
      {data.dailyTrend.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            📈 使用趋势
          </h3>
          <div className="h-48 flex items-end justify-between space-x-2">
            {data.dailyTrend.map((item: any, index: number) => {
              const maxValue = Math.max(...data.dailyTrend.map((d: any) => d.count));
              const height = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
              
              return (
                <div key={item.date} className="flex flex-col items-center flex-1">
                  <div
                    className="bg-blue-500 w-full rounded-t"
                    style={{ height: `${height}%` }}
                    title={`${item.date}: ${item.count} 次调用`}
                  ></div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 transform -rotate-45">
                    {new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 排行榜 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RankingTable
          title="热门服务器"
          icon="🏆"
          data={data.topServers}
          columns={serverColumns}
          rowKey="serverName"
        />
        <RankingTable
          title="热门工具"
          icon="🥇"
          data={data.topTools}
          columns={toolColumns}
          rowKey={(item) => `${item.serverName}-${item.toolName}`}
        />
        <RankingTable
          title="活跃用户"
          icon="👑"
          data={data.topUsers}
          columns={userColumns}
          rowKey="username"
        />
      </div>
    </div>
  );
};

export default McpUsageOverview; 