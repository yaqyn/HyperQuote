import { useState, useCallback } from 'react'
import { TextArea } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import {
  approveAction,
  rejectAction,
  requestMoreInfo,
} from '../../lib/server/approval'

// ============================================================================
// Types
// ============================================================================

type ActionState = 'idle' | 'rejecting' | 'requesting_info' | 'loading' | 'success'

// ============================================================================
// Component
// ============================================================================

interface ApprovalActionsProps {
  approvalId: string
}

export function ApprovalActions({ approvalId }: ApprovalActionsProps) {
  const { isOnline } = useOnlineStatus()
  const [state, setState] = useState<ActionState>('idle')
  const [reason, setReason] = useState(
    'Based on the current risk indicators, this request cannot be approved at this time.',
  )
  const [questions, setQuestions] = useState('')
  const [feedback, setFeedback] = useState('')

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  const handleApprove = useCallback(async () => {
    setState('loading')
    try {
      await approveAction({ data: { approvalId } })
      setState('success')
      setFeedback('Approved')
    } catch {
      setState('idle')
      setFeedback('Failed to approve')
    }
  }, [approvalId])

  const handleReject = useCallback(async () => {
    if (state !== 'rejecting') {
      setState('rejecting')
      return
    }
    if (!reason.trim()) return

    setState('loading')
    try {
      await rejectAction({ data: { approvalId, reason: reason.trim() } })
      setState('success')
      setFeedback('Rejected')
    } catch {
      setState('rejecting')
      setFeedback('Failed to reject')
    }
  }, [approvalId, reason, state])

  const handleRequestMoreInfo = useCallback(async () => {
    if (state !== 'requesting_info') {
      setState('requesting_info')
      return
    }
    if (!questions.trim()) return

    setState('loading')
    try {
      await requestMoreInfo({
        data: { approvalId, questions: questions.trim() },
      })
      setState('success')
      setFeedback('Info requested')
    } catch {
      setState('requesting_info')
      setFeedback('Failed to send request')
    }
  }, [approvalId, questions, state])

  const handleCancel = useCallback(() => {
    setState('idle')
    setFeedback('')
  }, [])

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  if (state === 'success') {
    return (
      <div className="border-t border-[var(--color-border)] pt-6">
        <p className="font-medium text-[var(--color-text)]">{feedback}</p>
      </div>
    )
  }

  return (
    <div className="border-t border-[var(--color-border)] pt-6">
      {/* Feedback message */}
      {feedback && (
        <p className="mb-4 text-sm text-[var(--color-error)]">{feedback}</p>
      )}

      {/* CRITICAL: HIDE buttons when offline -- not disabled */}
      {isOnline && (
        <div className="flex flex-col gap-4">
          {/* Action buttons */}
          <div className="flex gap-6">
            <button
              type="button"
              onClick={handleApprove}
              disabled={state === 'loading'}
              className="font-medium text-[var(--color-text)] outline-none transition-opacity hover:opacity-70 focus-visible:underline disabled:opacity-40"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={state === 'loading'}
              className="font-medium text-[var(--color-text)] outline-none transition-opacity hover:opacity-70 focus-visible:underline disabled:opacity-40"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={handleRequestMoreInfo}
              disabled={state === 'loading'}
              className="font-medium text-[var(--color-text-muted)] outline-none transition-opacity hover:opacity-70 focus-visible:underline disabled:opacity-40"
            >
              Request More Info
            </button>
          </div>

          {/* Rejection reason textarea */}
          <AnimatePresence>
            {state === 'rejecting' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeIn' }}
                className="overflow-hidden"
              >
                <label className="mb-2 block text-sm font-medium text-[var(--color-text-muted)]">
                  Rejection reason
                </label>
                <TextArea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-text)]"
                  aria-label="Rejection reason"
                />
                <div className="mt-2 flex gap-4">
                  <button
                    type="button"
                    onClick={handleReject}
                    className="text-sm font-medium text-[var(--color-text)] outline-none hover:opacity-70 focus-visible:underline"
                  >
                    Confirm Reject
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-sm text-[var(--color-text-muted)] outline-none hover:opacity-70 focus-visible:underline"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Request more info textarea */}
          <AnimatePresence>
            {state === 'requesting_info' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeIn' }}
                className="overflow-hidden"
              >
                <label className="mb-2 block text-sm font-medium text-[var(--color-text-muted)]">
                  Questions for the requester
                </label>
                <TextArea
                  value={questions}
                  onChange={(e) => setQuestions(e.target.value)}
                  rows={3}
                  placeholder="What additional information do you need?"
                  className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-text)]"
                  aria-label="Questions"
                />
                <div className="mt-2 flex gap-4">
                  <button
                    type="button"
                    onClick={handleRequestMoreInfo}
                    className="text-sm font-medium text-[var(--color-text)] outline-none hover:opacity-70 focus-visible:underline"
                  >
                    Send Request
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-sm text-[var(--color-text-muted)] outline-none hover:opacity-70 focus-visible:underline"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
