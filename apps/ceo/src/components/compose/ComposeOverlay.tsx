import { useState, useCallback } from 'react'
import { TextField, TextArea, Input, Label } from 'react-aria-components'
import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { GlassElevated } from '@hyperquote/ui/glass/GlassElevated'
import { routeMessage } from '../../lib/server/compose'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

// ============================================================================
// Department options
// ============================================================================

const DEPARTMENTS = [
  { id: 'sales', label: 'Sales' },
  { id: 'finance', label: 'Finance' },
  { id: 'operations', label: 'Operations' },
  { id: 'procurement', label: 'Procurement' },
  { id: 'hr', label: 'HR' },
  { id: 'support', label: 'Support' },
] as const

// ============================================================================
// Component
// ============================================================================

interface ComposeOverlayProps {
  isOpen: boolean
  onClose: () => void
  /** Pre-filled recipient department ID */
  recipientId?: string
}

export function ComposeOverlay({
  isOpen,
  onClose,
  recipientId,
}: ComposeOverlayProps) {
  const { isOnline } = useOnlineStatus()
  const [selectedDept, setSelectedDept] = useState(recipientId ?? '')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = useCallback(async () => {
    if (!selectedDept || !message.trim() || sending) return

    setSending(true)
    try {
      await routeMessage({
        data: {
          recipientId: selectedDept,
          message: message.trim(),
          priority,
        },
      })
      setSent(true)
      setTimeout(() => {
        onClose()
        // Reset state after close animation
        setTimeout(() => {
          setSent(false)
          setMessage('')
          setPriority('normal')
        }, 300)
      }, 1000)
    } catch {
      setSending(false)
    }
  }, [selectedDept, message, priority, sending, onClose])

  return (
    <GlassElevated isOpen={isOpen} onClose={onClose} className="w-full max-w-lg mx-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="p-6"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            Route Message
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-text-muted)] outline-none transition-colors hover:text-[var(--color-text)] focus-visible:bg-[var(--color-surface)]"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {sent ? (
          <p className="py-8 text-center font-medium text-[var(--color-text)]">
            Message sent
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Recipient department */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text-muted)]">
                Department
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-text)]"
                aria-label="Select department"
              >
                <option value="">Select department...</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            <TextField className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-[var(--color-text-muted)]">
                Message
              </Label>
              <TextArea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Type your message..."
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-text)]"
              />
            </TextField>

            {/* Priority toggle */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--color-text-muted)]">
                Priority
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`rounded-lg border px-4 py-1.5 text-sm font-medium outline-none transition-colors ${
                    priority === 'normal'
                      ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text)]'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={`rounded-lg border px-4 py-1.5 text-sm font-medium outline-none transition-colors ${
                    priority === 'urgent'
                      ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text)]'
                  }`}
                >
                  Urgent
                </button>
              </div>
            </div>

            {/* Send button -- hidden when offline */}
            {isOnline && (
              <button
                type="button"
                onClick={handleSend}
                disabled={!selectedDept || !message.trim() || sending}
                className="mt-2 font-medium text-[var(--color-text)] outline-none transition-opacity hover:opacity-70 focus-visible:underline disabled:opacity-40"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </GlassElevated>
  )
}
