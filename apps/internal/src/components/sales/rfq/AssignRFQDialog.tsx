import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  Modal,
  ModalOverlay,
  Button as AriaButton,
  Heading,
} from 'react-aria-components'
import { reassignRFQ } from '../../../lib/server/sales-rfq'

const TEAM_MEMBERS = [
  { id: 'user-001', name: 'Ahmed Hassan' },
  { id: 'user-002', name: 'Mariam Farouk' },
  { id: 'user-003', name: 'Omar Khaled' },
]

interface AssignRFQDialogProps {
  rfqId: string
  isOpen: boolean
  onClose: () => void
}

export function AssignRFQDialog({ rfqId, isOpen, onClose }: AssignRFQDialogProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (assigneeId: string) =>
      reassignRFQ({ data: { rfqId, toUserId: assigneeId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
      queryClient.invalidateQueries({ queryKey: ['rfq-detail', rfqId] })
      onClose()
    },
  })

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal className="w-full max-w-sm mx-4">
        <Dialog
          isKeyboardDismissDisabled
          className="rounded-2xl border border-black/[0.06] bg-white/90 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/[0.06] dark:bg-black/90 outline-none"
        >
          {({ close }) => (
            <>
              <Heading slot="title" className="text-[15px] font-semibold text-[var(--color-text)] mb-4">
                Assign to Team Member
              </Heading>

              <div className="flex flex-col gap-1">
                {TEAM_MEMBERS.map((member) => (
                  <AriaButton
                    key={member.id}
                    onPress={() => mutation.mutate(member.id)}
                    isDisabled={mutation.isPending}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-start outline-none cursor-pointer
                      data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]
                      data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
                      data-[disabled]:opacity-50"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[13px] font-semibold text-[var(--color-primary)]">
                      {member.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                    <span className="text-[13px] font-medium text-[var(--color-text)]">
                      {member.name}
                    </span>
                  </AriaButton>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <AriaButton
                  onPress={close}
                  className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-[var(--color-text)] outline-none
                    data-[hovered]:bg-black/[0.08] dark:data-[hovered]:bg-white/[0.1]
                    data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50"
                >
                  Cancel
                </AriaButton>
              </div>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
