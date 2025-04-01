const { useState, useEffect } = React;

function Badge({ status }) {
  const colors = {
    connected: 'bg-green-100 text-green-800',
    disconnected: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}>
      {status}
    </span>
  );
}

function ToolCard({ tool }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <h3 className="text-lg font-medium text-gray-900">{tool.name}</h3>
        <button className="text-gray-400 hover:text-gray-600">
          {isExpanded ? '▼' : '▶'}
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

function ServerCard({ server }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-semibold text-gray-900">{server.name}</h2>
          <Badge status={server.status} />
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>
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

function App() {
  const [servers, setServers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/servers')
      .then(response => response.json())
      .then(data => setServers(data))
      .catch(err => setError(err.message));

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      fetch('/api/servers')
        .then(response => response.json())
        .then(data => setServers(data))
        .catch(err => setError(err.message));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-red-600 text-xl font-semibold">Error</h2>
            <p className="text-gray-600 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">MCP Hub Dashboard</h1>
        {servers.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-600">No MCP servers available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {servers.map((server, index) => (
              <ServerCard key={index} server={server} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));