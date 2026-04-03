/**
 * Team management settings section.
 * "Data is the design" — rows with bottom borders, role as tiny uppercase.
 * Owner badge tiny uppercase. Invite button dark bg.
 * Hidden-not-disabled: owner sees full management, non-owner sees read-only.
 */
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import {
  Button,
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  TextField,
  Input,
  Label,
  Select,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  inviteTeamMember,
  removeTeamMember,
  changeTeamMemberRole,
  transferOwnership,
} from '../../lib/server/team'
import type { TeamMember } from '../../types/settings'

const ROLES = ['buyer', 'approver', 'site_manager'] as const
const ROLE_LABELS: Record<string, string> = {
  buyer: 'settings.team.roleBuyer',
  approver: 'settings.team.roleApprover',
  site_manager: 'settings.team.roleSiteManager',
}

interface TeamSectionProps {
  members: TeamMember[]
  isOwner: boolean
}

const labelClass =
  'text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]'

const underlineInputClass =
  'w-full bg-transparent border-0 border-b border-[var(--color-border)] py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[#2563EB] placeholder:text-[var(--color-text-subtle)]'

export function TeamSection({ members, isOwner }: TeamSectionProps) {
  const { t } = useTranslation('portal')
  const queryClient = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)

  const roleMutation = useMutation({
    mutationFn: (data: { memberId: string; newRole: 'buyer' | 'approver' | 'site_manager' }) =>
      changeTeamMemberRole({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      removeTeamMember({ data: { memberId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
      setRemovingMember(null)
    },
  })

  // Non-owner: read-only view
  if (!isOwner) {
    const ownEntry = members.find((m) => !m.isOwner)
    return (
      <div className="space-y-4">
        {ownEntry && (
          <div className="py-4 border-b border-[var(--color-border)]">
            <span className="text-sm text-[var(--color-text)]">
              {ownEntry.name}
            </span>
            <span className="ms-3 text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
              {t(ROLE_LABELS[ownEntry.role])}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Invite button */}
      <div className="flex justify-end">
        <Button
          onPress={() => setShowInvite(true)}
          className="px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
        >
          {t('settings.team.inviteMember')}
        </Button>
      </div>

      {/* Member rows */}
      <div>
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between py-4 border-b border-[var(--color-border)]"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--color-text)]">
                  {member.name}
                </span>
                {member.isOwner && (
                  <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
                    {t('settings.team.owner')}
                  </span>
                )}
                {!member.isOwner && (
                  <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
                    {t(ROLE_LABELS[member.role])}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-subtle)]">
                {member.email}
              </p>
              <p className="text-xs text-[var(--color-text-subtle)]">
                {t('settings.team.joined')}{' '}
                <span className="font-mono">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </span>
              </p>
            </div>

            {/* Role change + Remove (hidden for owner) */}
            {!member.isOwner && (
              <div className="flex items-center gap-4">
                <Select
                  selectedKey={member.role}
                  onSelectionChange={(key) =>
                    roleMutation.mutate({
                      memberId: member.id,
                      newRole: key as 'buyer' | 'approver' | 'site_manager',
                    })
                  }
                  aria-label={t('settings.team.role')}
                >
                  <Button className="bg-transparent border-0 border-b border-[var(--color-border)] py-1 text-xs text-[var(--color-text)] cursor-pointer outline-none focus:border-[#2563EB] transition-colors">
                    <SelectValue />
                  </Button>
                  <Popover className="w-40 border border-[var(--color-border)] bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-lg">
                    <ListBox className="p-1">
                      {ROLES.map((role) => (
                        <ListBoxItem
                          key={role}
                          id={role}
                          textValue={t(ROLE_LABELS[role])}
                          className="px-3 py-2 text-xs text-[var(--color-text)] cursor-pointer outline-none hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)] data-[selected]:font-medium"
                        >
                          {t(ROLE_LABELS[role])}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Popover>
                </Select>

                <Button
                  onPress={() => setRemovingMember(member)}
                  className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                >
                  {t('settings.team.removeMember')}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Transfer Ownership link */}
      <Button
        onPress={() => setShowTransfer(true)}
        className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
      >
        {t('settings.team.transferOwnership')}
      </Button>

      {/* Invite Dialog */}
      {showInvite && (
        <InviteDialog onClose={() => setShowInvite(false)} />
      )}

      {/* Remove Confirmation */}
      {removingMember && (
        <RemoveDialog
          member={removingMember}
          onConfirm={() => removeMutation.mutate(removingMember.id)}
          onClose={() => setRemovingMember(null)}
          isPending={removeMutation.isPending}
        />
      )}

      {/* Transfer Ownership Dialog */}
      {showTransfer && (
        <TransferDialog
          members={members.filter((m) => !m.isOwner)}
          onClose={() => setShowTransfer(false)}
        />
      )}
    </div>
  )
}

// ============================================================================
// Invite Dialog
// ============================================================================

function InviteDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('portal')
  const queryClient = useQueryClient()

  const { control, handleSubmit } = useForm<{
    email: string
    role: 'buyer' | 'approver' | 'site_manager'
  }>({
    defaultValues: { email: '', role: 'buyer' },
  })

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: 'buyer' | 'approver' | 'site_manager' }) =>
      inviteTeamMember({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
      onClose()
    },
  })

  const onSubmit = handleSubmit((data) => inviteMutation.mutate(data))

  return (
    <ModalOverlay
      isDismissable
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal
        isKeyboardDismissDisabled
        className="w-full max-w-md mx-4 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-[var(--color-border)] shadow-xl"
      >
        <Dialog className="p-6 outline-none">
          <Heading slot="title" className="text-sm font-medium text-[var(--color-text)] mb-6">
            {t('settings.team.inviteMember')}
          </Heading>

          <form onSubmit={onSubmit} className="space-y-5">
            <Controller
              name="email"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <TextField
                  value={field.value}
                  onChange={field.onChange}
                  type="email"
                  isRequired
                  className="space-y-1.5"
                >
                  <Label className={labelClass}>
                    {t('settings.team.email')}
                  </Label>
                  <Input
                    placeholder="colleague@company.com"
                    className={underlineInputClass}
                  />
                </TextField>
              )}
            />

            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select
                  selectedKey={field.value}
                  onSelectionChange={(key) =>
                    field.onChange(key as string)
                  }
                  className="space-y-1.5"
                >
                  <Label className={labelClass}>
                    {t('settings.team.role')}
                  </Label>
                  <Button className="w-full flex items-center justify-between bg-transparent border-0 border-b border-[var(--color-border)] py-2 text-sm text-[var(--color-text)] cursor-pointer outline-none focus:border-[#2563EB] transition-colors">
                    <SelectValue />
                  </Button>
                  <Popover className="w-[var(--trigger-width)] border border-[var(--color-border)] bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-lg">
                    <ListBox className="p-1">
                      {ROLES.map((role) => (
                        <ListBoxItem
                          key={role}
                          id={role}
                          textValue={t(ROLE_LABELS[role])}
                          className="px-3 py-2 text-sm text-[var(--color-text)] cursor-pointer outline-none hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)] data-[selected]:font-medium"
                        >
                          {t(ROLE_LABELS[role])}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Popover>
                </Select>
              )}
            />

            <p className="text-[11px] text-[var(--color-text-subtle)]">
              {t('settings.team.inviteNote')}
            </p>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                onPress={onClose}
                className="text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
              >
                {t('settings.cancel')}
              </Button>
              <Button
                type="submit"
                isDisabled={inviteMutation.isPending}
                className="px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {inviteMutation.isPending
                  ? t('settings.saving')
                  : t('settings.team.sendInvite')}
              </Button>
            </div>
          </form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

// ============================================================================
// Remove Dialog
// ============================================================================

function RemoveDialog({
  member,
  onConfirm,
  onClose,
  isPending,
}: {
  member: TeamMember
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}) {
  const { t } = useTranslation('portal')

  return (
    <ModalOverlay
      isDismissable
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal
        isKeyboardDismissDisabled
        className="w-full max-w-sm mx-4 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-[var(--color-border)] shadow-xl"
      >
        <Dialog className="p-6 outline-none">
          <Heading slot="title" className="text-sm font-medium text-[var(--color-text)] mb-4">
            {t('settings.team.removeConfirm', { name: member.name })}
          </Heading>
          <div className="flex justify-end gap-4">
            <Button
              onPress={onClose}
              className="text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
            >
              {t('settings.cancel')}
            </Button>
            <Button
              onPress={onConfirm}
              isDisabled={isPending}
              className="px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {t('settings.team.removeAction')}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

// ============================================================================
// Transfer Ownership Dialog
// ============================================================================

function TransferDialog({
  members,
  onClose,
}: {
  members: TeamMember[]
  onClose: () => void
}) {
  const { t } = useTranslation('portal')
  const queryClient = useQueryClient()
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState('')

  const transferMutation = useMutation({
    mutationFn: (data: { memberId: string; otpCode: string }) =>
      transferOwnership({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
      onClose()
    },
  })

  return (
    <ModalOverlay
      isDismissable
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal
        isKeyboardDismissDisabled
        className="w-full max-w-md mx-4 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-[var(--color-border)] shadow-xl"
      >
        <Dialog className="p-6 outline-none">
          <Heading slot="title" className="text-sm font-medium text-[var(--color-text)] mb-6">
            {t('settings.team.transferOwnership')}
          </Heading>

          <div className="space-y-5">
            <Select
              selectedKey={selectedMemberId}
              onSelectionChange={(key) =>
                setSelectedMemberId(key as string)
              }
              className="space-y-1.5"
            >
              <Label className={labelClass}>
                {t('settings.team.transferTo')}
              </Label>
              <Button className="w-full flex items-center justify-between bg-transparent border-0 border-b border-[var(--color-border)] py-2 text-sm text-[var(--color-text)] cursor-pointer outline-none focus:border-[#2563EB] transition-colors">
                <SelectValue />
              </Button>
              <Popover className="w-[var(--trigger-width)] border border-[var(--color-border)] bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-lg">
                <ListBox className="p-1">
                  {members.map((m) => (
                    <ListBoxItem
                      key={m.id}
                      id={m.id}
                      textValue={m.name}
                      className="px-3 py-2 text-sm text-[var(--color-text)] cursor-pointer outline-none hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)]"
                    >
                      {m.name}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Popover>
            </Select>

            <TextField
              value={otpCode}
              onChange={setOtpCode}
              className="space-y-1.5"
            >
              <Label className={labelClass}>
                {t('settings.team.otpCode')}
              </Label>
              <Input
                placeholder="000000"
                maxLength={6}
                className="w-full bg-transparent border-0 border-b border-[var(--color-border)] py-2 text-sm text-[var(--color-text)] font-mono text-center tracking-widest outline-none transition-colors focus:border-[#2563EB]"
              />
            </TextField>

            <p className="text-[11px] text-[var(--color-text-subtle)]">
              {t('settings.team.transferWarning')}
            </p>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                onPress={onClose}
                className="text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
              >
                {t('settings.cancel')}
              </Button>
              <Button
                onPress={() => {
                  if (selectedMemberId && otpCode.length === 6) {
                    transferMutation.mutate({
                      memberId: selectedMemberId,
                      otpCode,
                    })
                  }
                }}
                isDisabled={
                  !selectedMemberId ||
                  otpCode.length !== 6 ||
                  transferMutation.isPending
                }
                className="px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {t('settings.team.confirmTransfer')}
              </Button>
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
