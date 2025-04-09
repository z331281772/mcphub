import { ServerStatus } from '@/types'

interface BadgeProps {
  status: ServerStatus
}

const Badge = ({ status }: BadgeProps) => {
  const colors = {
    connecting: 'bg-yellow-100 text-yellow-800',
    connected: 'bg-green-100 text-green-800',
    disconnected: 'bg-red-100 text-red-800',
  }

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}
    >
      {status}
    </span>
  )
}

export default Badge