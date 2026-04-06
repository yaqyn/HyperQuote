import { describe, expect, it } from 'vitest'
import { getValidTransitions, canTransition, transitionCheque } from '../../lib/finance/cheque-state-machine'
import type { ChequeRecord, ChequeStatus } from '../../types/finance'

const makeCheque = (status: ChequeStatus): ChequeRecord => ({
  id: 'chq-001',
  chequeNumber: '123456',
  bankName: 'National Bank of Egypt',
  amount: 250_000,
  maturityDate: '2026-05-01',
  drawerName: 'Ahmed Hassan',
  customerId: 'cust-001',
  customerName: 'Cairo Construction Co.',
  status,
  linkedInvoiceId: 'inv-001',
})

describe('Cheque State Machine', () => {
  describe('getValidTransitions', () => {
    it('received -> deposited', () => {
      expect(getValidTransitions('received')).toEqual(['deposited'])
    })

    it('deposited -> cleared or bounced', () => {
      expect(getValidTransitions('deposited')).toEqual(['cleared', 'bounced'])
    })

    it('cleared has no transitions (terminal)', () => {
      expect(getValidTransitions('cleared')).toEqual([])
    })

    it('bounced -> re_presented, written_off, or replaced', () => {
      expect(getValidTransitions('bounced')).toEqual(['re_presented', 'written_off', 'replaced'])
    })

    it('re_presented -> cleared or bounced', () => {
      expect(getValidTransitions('re_presented')).toEqual(['cleared', 'bounced'])
    })

    it('written_off has no transitions (terminal)', () => {
      expect(getValidTransitions('written_off')).toEqual([])
    })

    it('replaced has no transitions (terminal)', () => {
      expect(getValidTransitions('replaced')).toEqual([])
    })
  })

  describe('canTransition', () => {
    it('allows valid transition: received -> deposited', () => {
      expect(canTransition('received', 'deposited')).toBe(true)
    })

    it('allows valid transition: deposited -> bounced', () => {
      expect(canTransition('deposited', 'bounced')).toBe(true)
    })

    it('allows valid transition: bounced -> re_presented', () => {
      expect(canTransition('bounced', 're_presented')).toBe(true)
    })

    it('rejects invalid transition: received -> cleared', () => {
      expect(canTransition('received', 'cleared')).toBe(false)
    })

    it('rejects invalid transition: cleared -> received', () => {
      expect(canTransition('cleared', 'received')).toBe(false)
    })

    it('rejects invalid transition: received -> bounced', () => {
      expect(canTransition('received', 'bounced')).toBe(false)
    })

    it('rejects invalid transition: cleared -> deposited', () => {
      expect(canTransition('cleared', 'deposited')).toBe(false)
    })
  })

  describe('transitionCheque', () => {
    it('transitions cheque successfully', () => {
      const cheque = makeCheque('received')
      const result = transitionCheque(cheque, 'deposited')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.cheque.status).toBe('deposited')
      }
    })

    it('returns error for invalid transition', () => {
      const cheque = makeCheque('received')
      const result = transitionCheque(cheque, 'cleared')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid transition')
        expect(result.error).toContain('received -> cleared')
      }
    })

    it('handles bounce -> re_present cycle', () => {
      let cheque = makeCheque('deposited')
      let result = transitionCheque(cheque, 'bounced')
      expect(result.success).toBe(true)
      if (result.success) cheque = result.cheque

      result = transitionCheque(cheque, 're_presented')
      expect(result.success).toBe(true)
      if (result.success) cheque = result.cheque

      result = transitionCheque(cheque, 'bounced')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.cheque.status).toBe('bounced')
      }
    })

    it('does not mutate original cheque', () => {
      const cheque = makeCheque('received')
      transitionCheque(cheque, 'deposited')
      expect(cheque.status).toBe('received')
    })
  })
})
