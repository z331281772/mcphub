const { useState, useEffect, Fragment } = React;
const { ChevronDown, ChevronRight } = window.LucideIcons || {};

function Badge({ status }) {
  const colors = {
    connected: 'bg-green-100 text-green-800',
    disconnected: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}
    >
      {status}
    </span>
  );
}

function ToolCard({ tool }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-medium text-gray-900">{tool.name}</h3>
        <button className="text-gray-400 hover:text-gray-600">
          {isExpanded ? (
            ChevronDown ? (
              <ChevronDown size={18} />
            ) : (
              '▼'
            )
          ) : ChevronRight ? (
            <ChevronRight size={18} />
          ) : (
            '▶'
          )}
        </button>
      </div>
      {isExpanded && (
        <div className="mt-4">
          <p className="text-gray-600 mb-2">{tool.description || 'No description available'}</p>
          <div className="bg-gray-50 rounded p-2">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Input Schema:</h4>
            <pre className="text-xs text-gray-600 overflow-auto">
              {JSON.stringify(tool.inputSchema, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function ServerCard({ server, onRemove }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleRemove = (e) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    onRemove(server.name);
    setShowDeleteDialog(false);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-semibold text-gray-900">{server.name}</h2>
          <Badge status={server.status} />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRemove}
            className="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm"
          >
            Delete
          </button>
          <button className="text-gray-400 hover:text-gray-600">
            {isExpanded ? (
              ChevronDown ? (
                <ChevronDown size={18} />
              ) : (
                '▼'
              )
            ) : ChevronRight ? (
              <ChevronRight size={18} />
            ) : (
              '▶'
            )}
          </button>
        </div>
      </div>

      <DeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        serverName={server.name}
      />

      {isExpanded && server.tools && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Available Tools</h3>
          <div className="space-y-4">
            {server.tools.map((tool, index) => (
              <ToolCard key={index} tool={tool} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AddServerForm({ onAdd }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [serverType, setServerType] = useState('command');
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    command: 'npx',
    args: ['-y', ''],
  });
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleArgsChange = (value) => {
    try {
      let args;
      if (value.trim().startsWith('[')) {
        args = JSON.parse(value);
      } else {
        args = ['-y', value];
      }
      setFormData({ ...formData, args });
    } catch (err) {
      setFormData({ ...formData, args: ['-y', value] });
    }
  };

  const toggleModal = () => {
    setModalVisible(!modalVisible);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const payload = {
        name: formData.name,
        config:
          serverType === 'url'
            ? { url: formData.url }
            : { command: formData.command, args: formData.args },
      };

      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || 'Failed to add server');
        return;
      }

      setFormData({
        name: '',
        url: '',
        command: 'npx',
        args: ['-y', ''],
      });
      setModalVisible(false);

      onAdd();
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  return (
    <div>
      <button
        onClick={toggleModal}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
      >
        Add New Server
      </button>

      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white shadow rounded-lg p-6 w-full max-w-xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add New Server</h2>
              <button onClick={toggleModal} className="text-gray-500 hover:text-gray-700">
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
                  placeholder="e.g., time-mcp"
                  required
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
                      checked={serverType === 'command'}
                      onChange={() => setServerType('command')}
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
                      checked={serverType === 'url'}
                      onChange={() => setServerType('url')}
                      className="mr-1"
                    />
                    <label htmlFor="url">sse</label>
                  </div>
                </div>
              </div>

              {serverType === 'url' ? (
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
                    placeholder="e.g., http://localhost:3000/sse"
                    required={serverType === 'url'}
                  />
                </div>
              ) : (
                <Fragment>
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
                      placeholder="e.g., npx"
                      required={serverType === 'command'}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="args">
                      Arguments
                    </label>
                    <input
                      type="text"
                      name="args"
                      id="args"
                      value={formData.args[1] || ''}
                      onChange={(e) => handleArgsChange(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="e.g., time-mcp"
                      required={serverType === 'command'}
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      "-y" argument will be added automatically
                    </p>
                  </div>
                </Fragment>
              )}

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={toggleModal}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded mr-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
                >
                  Add Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [servers, setServers] = useState([]);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch('/api/servers')
      .then((response) => response.json())
      .then((data) => setServers(data))
      .catch((err) => setError(err.message));

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      fetch('/api/servers')
        .then((response) => response.json())
        .then((data) => setServers(data))
        .catch((err) => setError(err.message));
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshKey]);

  const handleServerAdd = () => {
    setRefreshKey((prevKey) => prevKey + 1);
  };

  const handleServerRemove = async (serverName) => {
    try {
      const response = await fetch(`/api/servers/${serverName}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || `Failed to delete server ${serverName}`);
        return;
      }

      setRefreshKey((prevKey) => prevKey + 1);
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-red-600 text-xl font-semibold">Error</h2>
            <p className="text-gray-600 mt-2">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-4 bg-red-100 text-red-800 py-1 px-3 rounded hover:bg-red-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">MCP Hub Dashboard</h1>
          <AddServerForm onAdd={handleServerAdd} />
        </div>

        {servers.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-600">No MCP servers available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {servers.map((server, index) => (
              <ServerCard key={index} server={server} onRemove={handleServerRemove} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
