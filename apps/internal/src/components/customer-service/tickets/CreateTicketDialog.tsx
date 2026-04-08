import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { createTicket } from '../../../lib/server/customer-service'
import { useCustomerServiceStore } from '../../../stores/customer-service'
import { UnderlineInput, UnderlineTextArea } from '../../ui'
import { PillGroup, Pill } from '../../ui'
import type { TicketCategory, TicketPriority } from '../../../types/customer-service'

const CATEGORIES: Array<{ value: TicketCategory; label: string }> = [
  { value: 'order', label: 'Order' },
  { value: 'quote', label: 'Quote' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'payment', label: 'Payment' },
  { value: 'account', label: 'Account' },
  { value: 'product', label: 'Product' },
  { value: 'platform', label: 'Platform' },
]

const PRIORITIES: Array<{ value: TicketPriority; label: string }> = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

type WizardStep = 'customer' | 'subject' | 'description' | 'classify'

const STEPS: WizardStep[] = ['customer', 'subject', 'description', 'classify']

const STEP_LABELS: Record<WizardStep, string> = {
  customer: 'Customer',
  subject: 'Subject',
  description: 'Details',
  classify: 'Classify',
}

export function CreateTicketDialog() {
  const { t } = useTranslation('customer-service')
  const queryClient = useQueryClient()
  const open = useCustomerServiceStore((s) => s.createTicketOpen)
  const setOpen = useCustomerServiceStore((s) => s.setCreateTicketOpen)
  const setSelectedTicketId = useCustomerServiceStore((s) => s.setSelectedTicketId)

  const [step, setStep] = useState<WizardStep>('customer')
  const [customerName, setCustomerName] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory>('order')
  const [priority, setPriority] = useState<TicketPriority>('medium')

  const stepIndex = STEPS.indexOf(step)

  const mutation = useMutation({
    mutationFn: () =>
      createTicket({
        data: { customerName, subject, description, category, priority },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cs', 'tickets'] })
      // Auto-navigate to the new ticket
      if (result.ticketId) {
        setSelectedTicketId(result.ticketId)
      }
      resetForm()
      setOpen(false)
    },
  })

  function resetForm() {
    setCustomerName('')
    setSubject('')
    setDescription('')
    setCategory('order')
    setPriority('medium')
    setStep('customer')
  }

  function canAdvance(): boolean {
    switch (step) {
      case 'customer':
        return customerName.trim().length > 0
      case 'subject':
        return subject.trim().length > 0
      case 'description':
        return true // description is optional
      case 'classify':
        return true
      default:
        return false
    }
  }

  function handleNext() {
    if (!canAdvance()) return
    const nextIdx = stepIndex + 1
    if (nextIdx < STEPS.length) {
      setStep(STEPS[nextIdx])
    }
  }

  function handleBack() {
    const prevIdx = stepIndex - 1
    if (prevIdx >= 0) {
      setStep(STEPS[prevIdx])
    }
  }

  function handleSubmit() {
    if (!customerName.trim() || !subject.trim()) return
    mutation.mutate()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (step === 'classify') {
        handleSubmit()
      } else {
        handleNext()
      }
    }
  }

  const isLastStep = step === 'classify'

  return (
    <AnimatePresence>
      {open && (
        <ModalOverlay
          isOpen={open}
          onOpenChange={(val) => {
            if (!val) resetForm()
            setOpen(val)
          }}
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <Modal
            isOpen={open}
            onOpenChange={(val) => {
              if (!val) resetForm()
              setOpen(val)
            }}
            isKeyboardDismissDisabled
            className="outline-none"
          >
            <Dialog className="outline-none">
              {({ close }) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                  }}
                  className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-white/90 backdrop-blur-2xl shadow-2xl dark:bg-black/90"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
                    <Heading
                      slot="title"
                      className="text-base font-semibold text-[var(--color-text)]"
                    >
                      {t('tickets.createTicket', 'Create Ticket')}
                    </Heading>

                    {/* Step indicator with labels */}
                    <div className="flex items-center gap-3">
                      {STEPS.map((s, idx) => (
                        <div key={s} className="flex items-center gap-1.5">
                          <div
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              idx <= stepIndex
                                ? 'bg-[var(--color-primary)]'
                                : 'bg-black/10 dark:bg-white/10'
                            }`}
                          />
                          <span className={`text-[10px] transition-colors ${
                            idx === stepIndex
                              ? 'text-[var(--color-text)] font-medium'
                              : idx < stepIndex
                                ? 'text-[var(--color-text-subtle)]'
                                : 'text-[var(--color-text-subtle)] opacity-50'
                          }`}>
                            {STEP_LABELS[s]}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Button
                      onPress={() => {
                        resetForm()
                        close()
                      }}
                      className="rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer outline-none"
                    >
                      {t('tickets.close', 'Close')}
                    </Button>
                  </div>

                  {/* Wizard content */}
                  <div className="px-6 py-6 min-h-[180px]" onKeyDown={handleKeyDown}>
                    <AnimatePresence mode="wait">
                      {step === 'customer' && (
                        <motion.div
                          key="customer"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                        >
                          <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3 block">
                            {t('tickets.customer', 'Customer')}
                          </label>
                          <UnderlineInput
                            value={customerName}
                            onChange={setCustomerName}
                            placeholder={t('tickets.customerPlaceholder', 'Customer name...')}
                            label={t('tickets.customer', 'Customer')}
                            autoFocus
                          />
                          <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
                            {t('tickets.customerHint', 'Who is this ticket for?')}
                          </p>
                        </motion.div>
                      )}

                      {step === 'subject' && (
                        <motion.div
                          key="subject"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                        >
                          <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3 block">
                            {t('tickets.subject', 'Subject')}
                          </label>
                          <UnderlineInput
                            value={subject}
                            onChange={setSubject}
                            placeholder={t('tickets.subjectPlaceholder', 'Brief summary...')}
                            label={t('tickets.subject', 'Subject')}
                            autoFocus
                          />
                          <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
                            {t('tickets.subjectHint', 'One-line summary of the issue')}
                          </p>
                        </motion.div>
                      )}

                      {step === 'description' && (
                        <motion.div
                          key="description"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                        >
                          <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3 block">
                            {t('tickets.description', 'Description')}
                          </label>
                          <UnderlineTextArea
                            value={description}
                            onChange={setDescription}
                            placeholder={t('tickets.descriptionPlaceholder', 'Full description of the issue...')}
                            label={t('tickets.description', 'Description')}
                            rows={4}
                            autoFocus
                          />
                          <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
                            {t('tickets.descriptionHint', 'Optional — add details if needed')}
                          </p>
                        </motion.div>
                      )}

                      {step === 'classify' && (
                        <motion.div
                          key="classify"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="space-y-5"
                        >
                          {/* Category */}
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-2 block">
                              {t('tickets.category', 'Category')}
                            </label>
                            <PillGroup
                              aria-label={t('tickets.category', 'Category')}
                              value={category}
                              onChange={(val) => setCategory(val as TicketCategory)}
                            >
                              {CATEGORIES.map((cat) => (
                                <Pill key={cat.value} value={cat.value}>
                                  {cat.label}
                                </Pill>
                              ))}
                            </PillGroup>
                          </div>

                          {/* Priority */}
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-2 block">
                              {t('tickets.priority', 'Priority')}
                            </label>
                            <PillGroup
                              aria-label={t('tickets.priority', 'Priority')}
                              value={priority}
                              onChange={(val) => setPriority(val as TicketPriority)}
                            >
                              {PRIORITIES.map((p) => (
                                <Pill key={p.value} value={p.value}>
                                  {p.label}
                                </Pill>
                              ))}
                            </PillGroup>
                          </div>

                          {/* Summary */}
                          <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.02] p-3 text-xs text-[var(--color-text-muted)] space-y-1">
                            <div><span className="text-[var(--color-text-subtle)]">{t('tickets.customer', 'Customer')}:</span> {customerName}</div>
                            <div><span className="text-[var(--color-text-subtle)]">{t('tickets.subject', 'Subject')}:</span> {subject}</div>
                            {description && <div><span className="text-[var(--color-text-subtle)]">{t('tickets.description', 'Description')}:</span> {description.length > 80 ? `${description.slice(0, 80)}...` : description}</div>}
                            <div><span className="text-[var(--color-text-subtle)]">{t('tickets.category', 'Category')}:</span> {category}</div>
                            <div><span className="text-[var(--color-text-subtle)]">{t('tickets.priority', 'Priority')}:</span> {priority}</div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Footer with wizard navigation */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)]">
                    <div>
                      {stepIndex > 0 && (
                        <Button
                          onPress={handleBack}
                          className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors outline-none"
                        >
                          {t('tickets.back', 'Back')}
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onPress={() => {
                          resetForm()
                          close()
                        }}
                        className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors outline-none"
                      >
                        {t('tickets.cancel', 'Cancel')}
                      </Button>

                      {isLastStep ? (
                        <Button
                          onPress={handleSubmit}
                          isDisabled={!customerName.trim() || !subject.trim() || mutation.isPending}
                          className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity outline-none disabled:opacity-40 disabled:cursor-default"
                        >
                          {mutation.isPending
                            ? t('tickets.creating', 'Creating...')
                            : t('tickets.create', 'Create')}
                        </Button>
                      ) : (
                        <Button
                          onPress={handleNext}
                          isDisabled={!canAdvance()}
                          className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity outline-none disabled:opacity-40 disabled:cursor-default"
                        >
                          {t('tickets.next', 'Next')}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </AnimatePresence>
  )
}
