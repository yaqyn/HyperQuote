import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { assignTicket } from '../../../lib/server/customer-service'
import { useCustomerServiceStore } from '../../../stores/customer-service'

const AGENTS = [
  { id: 'sara', name: 'Sara Ahmed' },
  { id: 'mohamed', name: 'Mohamed Kamal' },
  { id: 'khaled', name: 'Khaled Ibrahim' },
  { id: 'fatma', name: 'Fatma Hassan' },
  { id: 'ahmed', name: 'Ahmed Nasser' },
]

export function AssignTicketDialog() {
  const { t } = useTranslation('customer-service')
  const queryClient = useQueryClient()
  const open = useCustomerServiceStore((s) => s.assignDialogOpen)
  const setOpen = useCustomerServiceStore((s) => s.setAssignDialogOpen)
  const selectedTicketId = useCustomerServiceStore((s) => s.selectedTicketId)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      assignTicket({
        data: { ticketId: selectedTicketId!, agentName: selectedAgent! },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs'] })
      setSelectedAgent(null)
      setOpen(false)
    },
  })

  function handleAssign() {
    if (!selectedAgent || !selectedTicketId) return
    mutation.mutate()
  }

  return (
    <AnimatePresence>
      {open && (
        <ModalOverlay
          isOpen={open}
          onOpenChange={setOpen}
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <Modal
            isOpen={open}
            onOpenChange={setOpen}
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
                  className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-white/90 backdrop-blur-2xl shadow-2xl dark:bg-black/90"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
                    <Heading
                      slot="title"
                      className="text-base font-semibold text-[var(--color-text)]"
                    >
                      {t('tickets.assignTicket', 'Assign Ticket')}
                    </Heading>
                    <Button
                      onPress={close}
                      className="rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer outline-none"
                    >
                      {t('tickets.close', 'Close')}
                    </Button>
                  </div>

                  {/* Agent list */}
                  <div className="px-6 py-4">
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
                      {t('tickets.selectAgent', 'Select Agent')}
                    </div>
                    <div className="flex flex-col gap-1">
                      {AGENTS.map((agent) => (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => setSelectedAgent(agent.name)}
                          className={`w-full text-start rounded-lg px-3 py-2.5 text-sm transition-colors cursor-pointer
                            ${selectedAgent === agent.name
                              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                              : 'text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                            }`}
                        >
                          {agent.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--color-border)]">
                    <Button
                      onPress={close}
                      className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors outline-none"
                    >
                      {t('tickets.cancel', 'Cancel')}
                    </Button>
                    <Button
                      onPress={handleAssign}
                      isDisabled={!selectedAgent || mutation.isPending}
                      className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity outline-none disabled:opacity-40 disabled:cursor-default"
                    >
                      {mutation.isPending
                        ? t('tickets.assigning', 'Assigning...')
                        : t('tickets.assign', 'Assign')}
                    </Button>
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
