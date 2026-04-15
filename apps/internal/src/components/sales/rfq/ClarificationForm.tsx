import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Heading,
} from 'react-aria-components'
import { Button } from '../../ui'
import { requestClarification } from '../../../lib/server/sales-rfq'
import type { ClarificationQuestionType } from '../../../types/sales'

const QUESTION_TYPES: { type: ClarificationQuestionType; label: string }[] = [
  { type: 'material_spec_ambiguous', label: 'Material specification is ambiguous or incomplete' },
  { type: 'quantity_unclear', label: 'Quantity is unclear or possibly incorrect' },
  { type: 'delivery_access', label: 'Delivery access or site requirements need clarification' },
  { type: 'no_date', label: 'No delivery date provided' },
  { type: 'mixed_units', label: 'Mixed or inconsistent units of measurement' },
  { type: 'missing_attachment', label: 'Referenced attachment or document is missing' },
]

interface ClarificationFormProps {
  rfqId: string
  isOpen: boolean
  onClose: () => void
}

export function ClarificationForm({ rfqId, isOpen, onClose }: ClarificationFormProps) {
  const { t } = useTranslation('internal')
  const queryClient = useQueryClient()

  const [selectedTypes, setSelectedTypes] = useState<Set<ClarificationQuestionType>>(new Set())
  const [freeText, setFreeText] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      const questions = Array.from(selectedTypes).map((type) => ({
        type,
        freeText: undefined as string | undefined,
      }))
      // Attach free text to the last question, or create a standalone one
      if (freeText.trim()) {
        if (questions.length > 0) {
          questions[questions.length - 1].freeText = freeText.trim()
        } else {
          questions.push({ type: 'material_spec_ambiguous' as ClarificationQuestionType, freeText: freeText.trim() })
        }
      }
      return requestClarification({ data: { rfqId, questions } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
      queryClient.invalidateQueries({ queryKey: ['rfq-detail', rfqId] })
      setSelectedTypes(new Set())
      setFreeText('')
      onClose()
    },
  })

  const toggleType = (type: ClarificationQuestionType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const canSubmit = selectedTypes.size > 0 || freeText.trim().length > 0

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      isDismissable={false}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <Modal className="w-full max-w-lg mx-4">
        <Dialog
          isKeyboardDismissDisabled
          className="rounded-xl bg-[var(--color-surface)]/95 dark:bg-black/95 shadow-2xl outline-none"
        >
          {({ close }) => (
            <div className="p-6">
              <Heading slot="title" className="text-[15px] font-semibold text-[var(--color-text)] mb-1">
                Request Clarification
              </Heading>

              <p className="text-[13px] text-[var(--color-text-muted)] mb-4">
                Select the issues that need clarification. The customer will receive a notification via portal, email, and WhatsApp.
              </p>

              {/* Question type checkboxes */}
              <div className="space-y-1.5 mb-4">
                {QUESTION_TYPES.map(({ type, label }) => (
                  <label
                    key={type}
                    className={`flex items-start gap-3 cursor-pointer rounded-lg px-3 py-2.5 transition-colors
                      ${selectedTypes.has(type)
                        ? 'bg-[var(--color-primary)]/[0.06]'
                        : 'bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.has(type)}
                      onChange={() => toggleType(type)}
                      className="mt-0.5 h-4 w-4 rounded accent-[var(--color-primary)]"
                    />
                    <span className="text-[13px] text-[var(--color-text)]">{label}</span>
                  </label>
                ))}
              </div>

              {/* Free text */}
              <div className="mb-6">
                <label className="block text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider mb-1.5">
                  Additional Questions
                </label>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Any additional questions or details needed..."
                  rows={3}
                  className="w-full rounded-lg bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2 text-[13px] outline-none
                    focus:ring-1 focus:ring-[var(--color-primary)]/50
                    placeholder:text-[var(--color-text-subtle)]"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onPress={() => {
                    setSelectedTypes(new Set())
                    setFreeText('')
                    onClose()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={() => mutation.mutate()}
                  isDisabled={!canSubmit || mutation.isPending}
                >
                  {mutation.isPending ? 'Sending...' : 'Send Clarification Request'}
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
