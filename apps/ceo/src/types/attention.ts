import type { EntityType } from './entity'

export interface AttentionItem {
  id: string
  type:
    | 'bounced_cheque'
    | 'ar_overdue'
    | 'delivery_failure'
    | 'po_rejection'
    | 'margin_alert'
    | 'credit_breach'
  severity: 'warning' | 'critical'
  entityName: string
  description: string
  amount?: number
  entityType: EntityType
  entityId: string
  createdAt: string
}
