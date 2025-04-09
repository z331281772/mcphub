import { useState } from 'react'
import { Server } from '@/types'
import { ChevronDown, ChevronRight } from '@/components/icons/LucideIcons'
import Badge from '@/components/ui/Badge'
import ToolCard from '@/components/ui/ToolCard'
import DeleteDialog from '@/components/ui/DeleteDialog'

interface ServerCardProps {
  server: Server
  onRemove: (serverName: string) => void
  onEdit: (server: Server) => void
}

const ServerCard = ({ server, onRemove, onEdit }: ServerCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteDialog(true)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(server)
  }

  const handleConfirmDelete = () => {
    onRemove(server.name)
    setShowDeleteDialog(false)
  }

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
            onClick={handleEdit}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm"
          >
            Edit
          </button>
          <button
            onClick={handleRemove}
            className="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm"
          >
            Delete
          </button>
          <button className="text-gray-400 hover:text-gray-600">
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
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
  )
}

export default ServerCard