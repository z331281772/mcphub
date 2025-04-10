import { useTranslation } from 'react-i18next'
import { Server } from '@/types'
import ServerForm from './ServerForm'

interface EditServerFormProps {
  server: Server
  onEdit: () => void
  onCancel: () => void
}

const EditServerForm = ({ server, onEdit, onCancel }: EditServerFormProps) => {
  const { t } = useTranslation()
  
  const handleSubmit = async (payload: any) => {
    try {
      const response = await fetch(`/api/servers/${server.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        alert(result.message || t('server.updateError', 'Failed to update server'))
        return
      }

      onEdit()
    } catch (err) {
      alert(`${t('errors.general')}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <ServerForm
        onSubmit={handleSubmit}
        onCancel={onCancel}
        initialData={server}
        modalTitle={t('server.editTitle', {serverName: server.name})}
      />
    </div>
  )
}

export default EditServerForm