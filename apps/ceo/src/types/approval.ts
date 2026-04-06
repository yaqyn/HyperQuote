export interface ApprovalItem {
  id: string
  type:
    | 'credit_limit'
    | 'margin_override'
    | 'write_off'
    | 'supplier_onboard'
    | 'expense'
  entityName: string
  description: string
  requestedBy: string
  requestedAt: string
  amount?: number
  currentValue?: number
  proposedValue?: number
  status: 'pending' | 'approved' | 'rejected' | 'info_requested'
  supportingData: Record<string, unknown>
  warningIndicators: string[]
}
