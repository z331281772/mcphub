import { useState } from 'react'
import { Tool } from '@/types'
import { ChevronDown, ChevronRight } from '@/components/icons/LucideIcons'

interface ToolCardProps {
  tool: Tool
}

const ToolCard = ({ tool }: ToolCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-medium text-gray-900">{tool.name}</h3>
        <button className="text-gray-400 hover:text-gray-600">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
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
  )
}

export default ToolCard