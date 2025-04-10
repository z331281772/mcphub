import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ServerForm from './ServerForm'

interface AddServerFormProps {
  onAdd: () => void
}

const AddServerForm = ({ onAdd }: AddServerFormProps) => {
  const { t } = useTranslation()
  const [modalVisible, setModalVisible] = useState(false)

  const toggleModal = () => {
    setModalVisible(!modalVisible)
  }

  const handleSubmit = async (payload: any) => {
    try {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        alert(result.message || 'Failed to add server')
        return
      }

      setModalVisible(false)
      onAdd()
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div>
      <button
        onClick={toggleModal}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
      >
        {t('server.addServer')}
      </button>

      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <ServerForm onSubmit={handleSubmit} onCancel={toggleModal} modalTitle={t('server.addServer')} />
        </div>
      )}
    </div>
  )
}

export default AddServerForm