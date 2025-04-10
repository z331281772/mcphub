import { useTranslation } from 'react-i18next'
import { ServerStatus } from '@/types'

interface BadgeProps {
  status: ServerStatus
}

const Badge = ({ status }: BadgeProps) => {
  const { t } = useTranslation()
  
  const colors = {
    connecting: 'bg-yellow-100 text-yellow-800',
    connected: 'bg-green-100 text-green-800',
    disconnected: 'bg-red-100 text-red-800',
  }

  // Map status to translation keys
  const statusTranslations = {
    connected: 'status.online',
    disconnected: 'status.offline',
    connecting: 'status.connecting'
  }

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}
    >
      {t(statusTranslations[status] || status)}
    </span>
  )
}

export default Badge