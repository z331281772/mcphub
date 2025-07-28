import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import McpUsageOverview from '../components/McpUsageOverview';
import UserMcpAnalysis from '../components/UserMcpAnalysis';
import UserAccessDashboard from '../components/UserAccessDashboard';

type ViewMode = 'overview' | 'user-analysis' | 'access-dashboard';

interface McpUsagePageState {
  mode: ViewMode;
  selectedUser?: string;
  selectedServer?: string;
  selectedTool?: string;
}

const McpUsagePage: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<McpUsagePageState>({
    mode: 'overview'
  });

  const handleUserClick = (username: string) => {
    setState({
      mode: 'user-analysis',
      selectedUser: username
    });
  };

  const handleServerClick = (serverName: string) => {
    // TODO: 可以后续扩展服务器详细分析
    console.log('Server clicked:', serverName);
  };

  const handleToolClick = (toolName: string, serverName: string) => {
    // TODO: 可以后续扩展工具详细分析
    console.log('Tool clicked:', toolName, 'on server:', serverName);
  };

  const handleBackToOverview = () => {
    setState({
      mode: 'overview'
    });
  };

  const handleShowAccessDashboard = () => {
    setState({
      mode: 'access-dashboard'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        {state.mode === 'overview' && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  📊 MCP 使用统计
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  查看用户对不同MCP服务器和工具的使用情况，支持深入分析
                </p>
              </div>
              <div>
                <button
                  onClick={handleShowAccessDashboard}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  👥 查看访问详情
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 内容区域 */}
        {state.mode === 'overview' ? (
          <McpUsageOverview
            onUserClick={handleUserClick}
            onServerClick={handleServerClick}
            onToolClick={handleToolClick}
          />
        ) : state.mode === 'user-analysis' && state.selectedUser ? (
          <UserMcpAnalysis
            username={state.selectedUser}
            onBack={handleBackToOverview}
          />
        ) : state.mode === 'access-dashboard' ? (
          <UserAccessDashboard
            onBack={handleBackToOverview}
          />
        ) : null}
      </div>
    </div>
  );
};

export default McpUsagePage; 