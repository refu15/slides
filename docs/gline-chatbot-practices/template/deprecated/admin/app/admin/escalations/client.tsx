'use client'

import { useRouter } from 'next/navigation'
import { Select } from '@/components/ui/select'
import { updateEscalationStatus } from './actions'

const STATUS_LABELS: Record<string, string> = {
  open: '未対応',
  in_progress: '対応中',
  resolved: '解決済み',
  dropped: '対応不要',
}

interface EscalationActionsProps {
  id: string
  currentStatus: string
}

export function EscalationActions({ id, currentStatus }: EscalationActionsProps) {
  const router = useRouter()

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await updateEscalationStatus(id, e.target.value)
    router.refresh()
  }

  return (
    <Select value={currentStatus} onChange={handleChange} className="text-xs h-8 w-32">
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </Select>
  )
}
