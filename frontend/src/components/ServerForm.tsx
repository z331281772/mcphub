import { useState } from 'react'
import { Server, EnvVar, ServerFormData } from '@/types'

interface ServerFormProps {
  onSubmit: (payload: any) => void
  onCancel: () => void
  initialData?: Server | null
  modalTitle: string
}

const ServerForm = ({ onSubmit, onCancel, initialData = null, modalTitle }: ServerFormProps) => {
  const [serverType, setServerType] = useState<'sse' | 'stdio'>(
    initialData && initialData.config && initialData.config.url ? 'sse' : 'stdio',
  )

  const [formData, setFormData] = useState<ServerFormData>({
    name: (initialData && initialData.name) || '',
    url: (initialData && initialData.config && initialData.config.url) || '',
    command: (initialData && initialData.config && initialData.config.command) || '',
    arguments:
      initialData && initialData.config && initialData.config.args
        ? Array.isArray(initialData.config.args)
          ? initialData.config.args.join(' ')
          : String(initialData.config.args)
        : '',
    args: (initialData && initialData.config && initialData.config.args) || [],
  })

  const [envVars, setEnvVars] = useState<EnvVar[]>(
    initialData && initialData.config && initialData.config.env
      ? Object.entries(initialData.config.env).map(([key, value]) => ({ key, value }))
      : [],
  )

  const [error, setError] = useState<string | null>(null)
  const isEdit = !!initialData

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  // Transform space-separated arguments string into array
  const handleArgsChange = (value: string) => {
    let args = value.split(' ').filter((arg) => arg.trim() !== '')
    setFormData({ ...formData, arguments: value, args })
  }

  const handleEnvVarChange = (index: number, field: 'key' | 'value', value: string) => {
    const newEnvVars = [...envVars]
    newEnvVars[index][field] = value
    setEnvVars(newEnvVars)
  }

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }])
  }

  const removeEnvVar = (index: number) => {
    const newEnvVars = [...envVars]
    newEnvVars.splice(index, 1)
    setEnvVars(newEnvVars)
  }

  // Submit handler for server configuration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const env: Record<string, string> = {}
      envVars.forEach(({ key, value }) => {
        if (key.trim()) {
          env[key.trim()] = value
        }
      })

      const payload = {
        name: formData.name,
        config:
          serverType === 'sse'
            ? { url: formData.url }
            : {
                command: formData.command,
                args: formData.args,
                env: Object.keys(env).length > 0 ? env : undefined,
              },
      }

      onSubmit(payload)
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 w-full max-w-xl max-h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{modalTitle}</h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Server Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleInputChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="e.g.: time-mcp"
            required
            disabled={isEdit}
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Server Type</label>
          <div className="flex space-x-4">
            <div>
              <input
                type="radio"
                id="command"
                name="serverType"
                value="command"
                checked={serverType === 'stdio'}
                onChange={() => setServerType('stdio')}
                className="mr-1"
              />
              <label htmlFor="command">stdio</label>
            </div>
            <div>
              <input
                type="radio"
                id="url"
                name="serverType"
                value="url"
                checked={serverType === 'sse'}
                onChange={() => setServerType('sse')}
                className="mr-1"
              />
              <label htmlFor="url">sse</label>
            </div>
          </div>
        </div>

        {serverType === 'sse' ? (
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="url">
              Server URL
            </label>
            <input
              type="url"
              name="url"
              id="url"
              value={formData.url}
              onChange={handleInputChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="e.g.: http://localhost:3000/sse"
              required={serverType === 'sse'}
            />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="command">
                Command
              </label>
              <input
                type="text"
                name="command"
                id="command"
                value={formData.command}
                onChange={handleInputChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="e.g.: npx"
                required={serverType === 'stdio'}
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="arguments">
                Arguments
              </label>
              <input
                type="text"
                name="arguments"
                id="arguments"
                value={formData.arguments}
                onChange={(e) => handleArgsChange(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="e.g.: -y time-mcp"
                required={serverType === 'stdio'}
              />
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-700 text-sm font-bold">
                  Environment Variables
                </label>
                <button
                  type="button"
                  onClick={addEnvVar}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-1 px-2 rounded text-sm flex items-center"
                >
                  + Add
                </button>
              </div>
              {envVars.map((envVar, index) => (
                <div key={index} className="flex items-center mb-2">
                  <div className="flex items-center space-x-2 flex-grow">
                    <input
                      type="text"
                      value={envVar.key}
                      onChange={(e) => handleEnvVarChange(index, 'key', e.target.value)}
                      className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline w-1/2"
                      placeholder="key"
                    />
                    <span className="flex items-center">:</span>
                    <input
                      type="text"
                      value={envVar.value}
                      onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                      className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline w-1/2"
                      placeholder="value"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEnvVar(index)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-1 px-2 rounded text-sm flex items-center justify-center min-w-[56px] ml-2"
                  >
                    - Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded mr-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
          >
            {isEdit ? 'Save Changes' : 'Add Server'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ServerForm