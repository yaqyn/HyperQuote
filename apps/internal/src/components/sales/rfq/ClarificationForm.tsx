import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Button,
  Heading,
} from 'react-aria-components'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal className="w-full max-w-lg mx-4">
        <Dialog
          isKeyboardDismissDisabled
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-2xl outline-none"
        >
          {({ close }) => (
            <div className="p-6">
              <Heading slot="title" className="text-lg font-semibold mb-4">
                Request Clarification
              </Heading>

              <p className="text-sm text-black/60 dark:text-white/60 mb-4">
                Select the issues that need clarification. The customer will receive a notification via portal, email, and WhatsApp.
              </p>

              {/* Question type checkboxes */}
              <div className="space-y-2 mb-4">
                {QUESTION_TYPES.map(({ type, label }) => (
                  <label
                    key={type}
                    className="flex items-start gap-3 cursor-pointer rounded-lg border border-black/10 dark:border-white/10 px-3 py-2.5 transition-colors
                      hover:bg-black/3 dark:hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.has(type)}
                      onChange={() => toggleType(type)}
                      className="mt-0.5 h-4 w-4 rounded border-black/30 text-[#2563EB] accent-[#2563EB]"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>

              {/* Free text */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1.5">
                  Additional Questions
                </label>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Any additional questions or details needed..."
                  rows={3}
                  className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none
                    focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/50
                    placeholder:text-black/30 dark:placeholder:text-white/30"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium outline-none
                    data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10
                    data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
                  onPress={() => {
                    setSelectedTypes(new Set())
                    setFreeText('')
                    onClose()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white outline-none
                    data-[hovered]:bg-[#2563EB]/90
                    data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-2
                    data-[disabled]:opacity-50"
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
