import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Server, ApiResponse } from './types'
import ServerCard from './components/ServerCard'
import AddServerForm from './components/AddServerForm'
import EditServerForm from './components/EditServerForm'

function App() {
  const { t } = useTranslation()
  const [servers, setServers] = useState<Server[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingServer, setEditingServer] = useState<Server | null>(null)

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await fetch('/api/servers')
        const data = await response.json()
        
        // 处理API响应中的包装对象，提取data字段
        if (data && data.success && Array.isArray(data.data)) {
          setServers(data.data)
        } else if (data && Array.isArray(data)) {
          // 兼容性处理，如果API直接返回数组
          setServers(data)
        } else {
          // 如果数据格式不符合预期，设置为空数组
          console.error('Invalid server data format:', data)
          setServers([])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    }
    
    fetchServers()

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchServers, 5000)
    return () => clearInterval(interval)
  }, [refreshKey])

  const handleServerAdd = () => {
    setRefreshKey(prevKey => prevKey + 1)
  }

  const handleServerEdit = (server: Server) => {
    // Fetch settings to get the full server config before editing
    fetch(`/api/settings`)
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
      const response = await fetch(`/api/servers/${serverName}`, {
        method: 'DELETE',
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

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-red-600 text-xl font-semibold">{t('app.error')}</h2>
            <p className="text-gray-600 mt-2">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-4 bg-red-100 text-red-800 py-1 px-3 rounded hover:bg-red-200"
            >
              {t('app.closeButton')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('app.title')}</h1>
          <AddServerForm onAdd={handleServerAdd} />
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

export default App