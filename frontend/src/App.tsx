import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import { Server, ApiResponse } from './types'
import ServerCard from './components/ServerCard'
import AddServerForm from './components/AddServerForm'
import EditServerForm from './components/EditServerForm'
import LoginPage from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// 配置选项
const CONFIG = {
  // 初始化启动阶段的配置
  startup: {
    maxAttempts: 60,                // 初始化阶段最大尝试次数
    pollingInterval: 3000           // 初始阶段轮询间隔 (3秒)
  },
  // 正常运行阶段的配置
  normal: {
    pollingInterval: 10000          // 正常运行时的轮询间隔 (10秒)
  }
}

// Dashboard component that contains the main application
const Dashboard = () => {
  const { t } = useTranslation()
  const [servers, setServers] = useState<Server[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingServer, setEditingServer] = useState<Server | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [fetchAttempts, setFetchAttempts] = useState(0)
  const { auth, logout } = useAuth()
  const navigate = useNavigate()
  
  // 轮询定时器引用
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  // 保存当前尝试次数，避免依赖循环
  const attemptsRef = useRef<number>(0)

  // 清理定时器
  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // 开始正常轮询
  const startNormalPolling = useCallback(() => {
    // 确保没有其他定时器在运行
    clearTimer()
    
    const fetchServers = async () => {
      try {
        const token = localStorage.getItem('mcphub_token');
        const response = await fetch('/api/servers', {
          headers: {
            'x-auth-token': token || ''
          }
        });
        const data = await response.json()
        
        if (data && data.success && Array.isArray(data.data)) {
          setServers(data.data)
        } else if (data && Array.isArray(data)) {
          setServers(data)
        } else {
          console.error('Invalid server data format:', data)
          setServers([])
        }
        
        // 重置错误状态
        setError(null)
      } catch (err) {
        console.error('Error fetching servers during normal polling:', err)
        
        // 使用友好的错误消息
        if (!navigator.onLine) {
          setError(t('errors.network'))
        } else if (err instanceof TypeError && (
          err.message.includes('NetworkError') || 
          err.message.includes('Failed to fetch')
        )) {
          setError(t('errors.serverConnection'))
        } else {
          setError(t('errors.serverFetch'))
        }
      }
    }
    
    // 立即执行一次
    fetchServers()
    
    // 设置定期轮询
    intervalRef.current = setInterval(fetchServers, CONFIG.normal.pollingInterval)
  }, [t])

  useEffect(() => {
    // 重置尝试计数
    if (refreshKey > 0) {
      attemptsRef.current = 0;
      setFetchAttempts(0);
    }
    
    // 初始化加载阶段的请求函数
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('mcphub_token');
        const response = await fetch('/api/servers', {
          headers: {
            'x-auth-token': token || ''
          }
        });
        const data = await response.json()
        
        // 处理API响应中的包装对象，提取data字段
        if (data && data.success && Array.isArray(data.data)) {
          setServers(data.data)
          setIsInitialLoading(false)
          // 初始化成功，开始正常轮询
          startNormalPolling()
          return true
        } else if (data && Array.isArray(data)) {
          // 兼容性处理，如果API直接返回数组
          setServers(data)
          setIsInitialLoading(false)
          // 初始化成功，开始正常轮询
          startNormalPolling()
          return true
        } else {
          // 如果数据格式不符合预期，设置为空数组
          console.error('Invalid server data format:', data)
          setServers([])
          setIsInitialLoading(false)
          // 初始化成功但数据为空，开始正常轮询
          startNormalPolling()
          return true
        }
      } catch (err) {
        // 增加尝试次数计数，使用 ref 避免触发 effect 重新运行
        attemptsRef.current += 1;
        console.error(`Initial loading attempt ${attemptsRef.current} failed:`, err)
        
        // 更新状态用于显示
        setFetchAttempts(attemptsRef.current)
        
        // 设置适当的错误消息
        if (!navigator.onLine) {
          setError(t('errors.network'))
        } else {
          setError(t('errors.initialStartup'))
        }
        
        // 如果已超过最大尝试次数，放弃初始化并切换到正常轮询
        if (attemptsRef.current >= CONFIG.startup.maxAttempts) {
          console.log('Maximum startup attempts reached, switching to normal polling')
          setIsInitialLoading(false)
          // 清除初始化的轮询
          clearTimer()
          // 切换到正常轮询模式
          startNormalPolling()
        }
        
        return false
      }
    }
    
    // 组件挂载时，根据当前状态设置适当的轮询
    if (isInitialLoading) {
      // 确保没有其他定时器在运行
      clearTimer()
      
      // 立即执行一次初始请求
      fetchInitialData()
      
      // 设置初始阶段的轮询间隔
      intervalRef.current = setInterval(fetchInitialData, CONFIG.startup.pollingInterval)
      console.log(`Started initial polling with interval: ${CONFIG.startup.pollingInterval}ms`)
    } else {
      // 已经初始化完成，开始正常轮询
      startNormalPolling()
    }
    
    // 清理函数
    return () => {
      clearTimer()
    }
  }, [refreshKey, t, isInitialLoading, startNormalPolling])

  // 手动触发刷新
  const triggerRefresh = () => {
    // 清除当前的定时器
    clearTimer()
    
    // 如果在初始化阶段，重置初始化状态
    if (isInitialLoading) {
      setIsInitialLoading(true)
      attemptsRef.current = 0
      setFetchAttempts(0)
    }
    
    // refreshKey 的改变会触发 useEffect 再次运行
    setRefreshKey(prevKey => prevKey + 1)
  }

  const handleServerAdd = () => {
    setRefreshKey(prevKey => prevKey + 1)
  }

  const handleServerEdit = (server: Server) => {
    // Fetch settings to get the full server config before editing
    const token = localStorage.getItem('mcphub_token');
    fetch(`/api/settings`, {
      headers: {
        'x-auth-token': token || ''
      }
    })
      .then(response => response.json())
      .then((settingsData: ApiResponse<{ mcpServers: Record<string, any> }>) => {
        if (
          settingsData &&
          settingsData.success &&
          settingsData.data &&
          settingsData.data.mcpServers &&
          settingsData.data.mcpServers[server.name]
        ) {
          const serverConfig = settingsData.data.mcpServers[server.name]
          const fullServerData = {
            name: server.name,
            status: server.status,
            tools: server.tools || [],
            config: serverConfig,
          }

          console.log('Editing server with config:', fullServerData)
          setEditingServer(fullServerData)
        } else {
          console.error('Failed to get server config from settings:', settingsData)
          setError(t('server.invalidConfig', { serverName: server.name }))
        }
      })
      .catch(err => {
        console.error('Error fetching server settings:', err)
        setError(err instanceof Error ? err.message : String(err))
      })
  }

  const handleEditComplete = () => {
    setEditingServer(null)
    setRefreshKey(prevKey => prevKey + 1)
  }

  const handleServerRemove = async (serverName: string) => {
    try {
      const token = localStorage.getItem('mcphub_token');
      const response = await fetch(`/api/servers/${serverName}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token || ''
        }
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.message || t('server.deleteError', { serverName }))
        return
      }

      setRefreshKey(prevKey => prevKey + 1)
    } catch (err) {
      setError(t('errors.general') + ': ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleServerToggle = async (server: Server, enabled: boolean) => {
    try {
      const token = localStorage.getItem('mcphub_token');
      const response = await fetch(`/api/servers/${server.name}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || ''
        },
        body: JSON.stringify({ enabled }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to toggle server:', result);
        setError(t('server.toggleError', { serverName: server.name }));
        return;
      }

      // Update the UI immediately to reflect the change
      setRefreshKey(prevKey => prevKey + 1);
    } catch (err) {
      console.error('Error toggling server:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-red-600 text-lg font-medium">{t('app.error')}</h3>
                <p className="text-gray-600 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-4 text-gray-500 hover:text-gray-700"
                aria-label={t('app.closeButton')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 011.414 0L10 8.586l4.293-4.293a1 1 111.414 1.414L11.414 10l4.293 4.293a1 1 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 01-1.414-1.414L8.586 10 4.293 5.707a1 1 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('app.title')}</h1>
          <div className="flex items-center">
            <AddServerForm onAdd={handleServerAdd} />
            <button
              onClick={() => navigate('/change-password')}
              className="ml-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {t('app.changePassword')}
            </button>
            <button
              onClick={handleLogout}
              className="ml-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              {t('app.logout')}
            </button>
          </div>
        </div>
        {servers.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-600">{t('app.noServers')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {servers.map((server, index) => (
              <ServerCard
                key={index}
                server={server}
                onRemove={handleServerRemove}
                onEdit={handleServerEdit}
                onToggle={handleServerToggle}
              />
            ))}
          </div>
        )}
        {editingServer && (
          <EditServerForm
            server={editingServer}
            onEdit={handleEditComplete}
            onCancel={() => setEditingServer(null)}
          />
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App