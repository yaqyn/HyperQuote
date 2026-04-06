/**
 * Post-Dated Cheque (PDC) status state machine.
 * Enforces valid transitions per Egyptian banking practice.
 *
 * Valid transitions:
 *   received -> deposited
 *   deposited -> cleared
 *   deposited -> bounced
 *   bounced -> re_presented
 *   bounced -> written_off
 *   bounced -> replaced
 *   re_presented -> cleared
 *   re_presented -> bounced
 *
 * Bounced cheque is a CRIMINAL OFFENSE under Egyptian law.
 */

import type { ChequeRecord, ChequeStatus } from '../../types/finance'

const VALID_TRANSITIONS: Record<ChequeStatus, ChequeStatus[]> = {
  received: ['deposited'],
  deposited: ['cleared', 'bounced'],
  cleared: [],
  bounced: ['re_presented', 'written_off', 'replaced'],
  re_presented: ['cleared', 'bounced'],
  written_off: [],
  replaced: [],
}

/**
 * Get valid next statuses from current status.
 */
export function getValidTransitions(currentStatus: ChequeStatus): ChequeStatus[] {
  return VALID_TRANSITIONS[currentStatus] ?? []
}

/**
 * Check if a transition from one status to another is valid.
 */
export function canTransition(from: ChequeStatus, to: ChequeStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Attempt to transition a cheque to a new status.
 * Returns updated cheque on success, error on invalid transition.
 */
export function transitionCheque(
  cheque: ChequeRecord,
  newStatus: ChequeStatus,
  _reason?: string,
): { success: true; cheque: ChequeRecord } | { success: false; error: string } {
  if (!canTransition(cheque.status, newStatus)) {
    return {
      success: false,
      error: `Invalid transition: ${cheque.status} -> ${newStatus}. Valid transitions: ${getValidTransitions(cheque.status).join(', ') || 'none'}`,
    }
  }

  return {
    success: true,
    cheque: { ...cheque, status: newStatus },
  }
}
