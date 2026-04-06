import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { ChequeRecord } from '../../types/finance'
import { canTransition } from '../finance/cheque-state-machine'

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10)
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10)

function getMockCheques(): ChequeRecord[] {
  return [
    { id: 'chq-001', chequeNumber: '456789', bankName: 'National Bank of Egypt', amount: 350_000, maturityDate: daysFromNow(15), drawerName: 'Ahmed Hassan', customerId: 'cust-001', customerName: 'Cairo Construction Co.', status: 'received', linkedInvoiceId: 'inv-001' },
    { id: 'chq-002', chequeNumber: '456790', bankName: 'Banque Misr', amount: 180_000, maturityDate: daysFromNow(3), drawerName: 'Mohamed Ali', customerId: 'cust-002', customerName: 'Delta Building Materials', status: 'deposited', linkedInvoiceId: 'inv-002' },
    { id: 'chq-003', chequeNumber: '456791', bankName: 'CIB', amount: 520_000, maturityDate: daysAgo(5), drawerName: 'Khaled Mahmoud', customerId: 'cust-003', customerName: 'Nile Development Group', status: 'cleared', linkedInvoiceId: 'inv-003' },
    { id: 'chq-004', chequeNumber: '456792', bankName: 'QNB Alahli', amount: 275_000, maturityDate: daysAgo(10), drawerName: 'Tarek Ibrahim', customerId: 'cust-004', customerName: 'Upper Egypt Contractors', status: 'bounced', linkedInvoiceId: 'inv-004' },
  ]
}

export const getCheques = createServerFn({ method: 'GET' })
  .handler(async () => {
    return { cheques: getMockCheques() }
  })

const updateChequeStatusInput = z.object({
  chequeId: z.string(),
  status: z.enum(['received', 'deposited', 'cleared', 'bounced', 're_presented', 'written_off', 'replaced']),
  reason: z.string().optional(),
})

export const updateChequeStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateChequeStatusInput)
  .handler(async ({ data: input }) => {
    const cheques = getMockCheques()
    const cheque = cheques.find((c) => c.id === input.chequeId)
    if (!cheque) return { success: false, error: 'Cheque not found' }
    if (!canTransition(cheque.status, input.status)) {
      return { success: false, error: `Invalid transition: ${cheque.status} -> ${input.status}` }
    }
    // Side-effect: when bounced, reverses AR accounting entry
    // and adds amount back to customer outstanding AR
    if (input.status === 'bounced') {
      // Mock: AR reversal + credit hold trigger
      return { success: true, arReversed: true, creditHoldTriggered: true }
    }
    return { success: true }
  })

const batchUpdateInput = z.object({
  updates: z.array(z.object({
    chequeId: z.string(),
    status: z.enum(['received', 'deposited', 'cleared', 'bounced', 're_presented', 'written_off', 'replaced']),
    reason: z.string().optional(),
  })),
})

export const batchUpdateChequeStatus = createServerFn({ method: 'POST' })
  .inputValidator(batchUpdateInput)
  .handler(async ({ data: input }) => {
    const cheques = getMockCheques()
    const updated: string[] = []
    const customersOnCreditHold: string[] = []

    for (const update of input.updates) {
      const cheque = cheques.find((c) => c.id === update.chequeId)
      if (cheque && canTransition(cheque.status, update.status)) {
        updated.push(update.chequeId)
        if (update.status === 'bounced') {
          customersOnCreditHold.push(cheque.customerId)
        }
      }
    }

    return { batchId: `batch-${Date.now()}`, updated, customersOnCreditHold }
  })
