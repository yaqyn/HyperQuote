import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10)

const importBankStatementInput = z.object({
  fileUrl: z.string(),
  bankAccountId: z.string(),
})

export const importBankStatement = createServerFn({ method: 'POST' })
  .inputValidator(importBankStatementInput)
  .handler(async ({ data: _input }) => {
    // Return realistic mock transactions (5-8 entries)
    const transactions = [
      { id: 'bt-001', date: daysAgo(1), description: 'Wire transfer - Cairo Construction Co.', amount: 1_425_000, reference: 'TRF-2026-04-001', type: 'credit' as const },
      { id: 'bt-002', date: daysAgo(1), description: 'Cheque deposit 456789', amount: 350_000, reference: 'CHQ-456789', type: 'credit' as const },
      { id: 'bt-003', date: daysAgo(2), description: 'Wire transfer - Nile Development', amount: 352_260, reference: 'TRF-2026-04-002', type: 'credit' as const },
      { id: 'bt-004', date: daysAgo(2), description: 'Bank charges - April', amount: -4_500, reference: 'FEE-APR-2026', type: 'debit' as const },
      { id: 'bt-005', date: daysAgo(3), description: 'Wire transfer - Delta Building Materials', amount: 273_600, reference: 'TRF-2026-04-003', type: 'credit' as const },
      { id: 'bt-006', date: daysAgo(3), description: 'LC proceeds - Alexandria Cement', amount: 890_000, reference: 'LC-2026-0042', type: 'credit' as const },
      { id: 'bt-007', date: daysAgo(4), description: 'Cash deposit branch 15', amount: 125_000, reference: 'CASH-DEP-0078', type: 'credit' as const },
      { id: 'bt-008', date: daysAgo(5), description: 'Wire - unknown sender', amount: 67_500, reference: 'MISC-TRF-99', type: 'credit' as const },
    ]

    // Simple auto-matching: match by reference pattern or known amounts
    const knownAmounts = [1_425_000, 350_000, 352_260, 273_600, 890_000]
    const autoMatched = transactions.filter((t) => knownAmounts.includes(Math.abs(t.amount)))

    return {
      transactionCount: transactions.length,
      autoMatchedCount: autoMatched.length,
      transactions,
    }
  })

const reconcileInput = z.object({
  bankAccountId: z.string(),
  entries: z.array(z.object({
    id: z.string(),
    date: z.string(),
    description: z.string(),
    amount: z.number(),
    reference: z.string(),
  })),
})

// Mock book entries for matching against
const MOCK_BOOK_ENTRIES = [
  { id: 'book-001', date: daysAgo(1), description: 'Invoice INV-2026-0001 payment', amount: 1_425_000, reference: 'pay-001' },
  { id: 'book-002', date: daysAgo(1), description: 'Cheque CHQ-456789 cleared', amount: 350_000, reference: 'chq-001' },
  { id: 'book-003', date: daysAgo(2), description: 'Invoice INV-2026-0003 payment', amount: 352_260, reference: 'pay-003' },
  { id: 'book-004', date: daysAgo(3), description: 'Invoice INV-2026-0002 payment', amount: 273_600, reference: 'pay-002' },
  { id: 'book-005', date: daysAgo(3), description: 'LC-2026-0042 proceeds', amount: 890_000, reference: 'lc-001' },
]

export const reconcileBankStatement = createServerFn({ method: 'POST' })
  .inputValidator(reconcileInput)
  .handler(async ({ data: input }) => {
    const matched: { bankEntryId: string; bookEntryId: string; amount: number; confidence: number }[] = []
    const unmatchedBank: typeof input.entries = []
    const usedBookIds = new Set<string>()

    for (const entry of input.entries) {
      // Match by amount (+/-0.01) and date (+/-1 day)
      const match = MOCK_BOOK_ENTRIES.find((book) => {
        if (usedBookIds.has(book.id)) return false
        const amountMatch = Math.abs(entry.amount - book.amount) <= 0.01
        const entryDate = new Date(entry.date).getTime()
        const bookDate = new Date(book.date).getTime()
        const dateMatch = Math.abs(entryDate - bookDate) <= 86_400_000 // +/- 1 day
        return amountMatch && dateMatch
      })

      if (match) {
        usedBookIds.add(match.id)
        const amountExact = entry.amount === match.amount
        const dateExact = entry.date === match.date
        const confidence = amountExact && dateExact ? 99 : amountExact ? 95 : 85

        matched.push({
          bankEntryId: entry.id,
          bookEntryId: match.id,
          amount: entry.amount,
          confidence,
        })
      } else {
        unmatchedBank.push(entry)
      }
    }

    // Unmatched book entries (in books but not in bank)
    const unmatchedBook = MOCK_BOOK_ENTRIES
      .filter((b) => !usedBookIds.has(b.id))
      .map((b) => ({ id: b.id, date: b.date, description: b.description, amount: b.amount, reference: b.reference }))

    return {
      matched: matched.length,
      unmatched: unmatchedBank.length + unmatchedBook.length,
      matchedPairs: matched,
      unmatchedBankEntries: unmatchedBank,
      unmatchedBookEntries: unmatchedBook,
      reconciledAt: new Date().toISOString(),
    }
  })
