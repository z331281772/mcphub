import { useTranslation } from 'react-i18next'

interface DeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  serverName: string
}

const DeleteDialog = ({ isOpen, onClose, onConfirm, serverName }: DeleteDialogProps) => {
  const { t } = useTranslation()
  
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white shadow rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('server.delete')}</h3>
        <p className="text-gray-700">
          {t('server.confirmDelete')} <strong>{serverName}</strong>
        </p>
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded mr-2"
          >
            {t('server.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
          >
            {t('server.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteDialog