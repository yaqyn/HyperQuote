/**
 * Team management settings section.
 * Hidden-not-disabled: owner sees full management, non-owner sees read-only.
 * Invite: email + magic link per CONTEXT.md Section 2.17.
 * Remove: confirmation modal. Transfer ownership: OTP required.
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
import { UserPlus, Trash2, Users, ArrowRightLeft } from 'lucide-react'
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

export function TeamSection({ members, isOwner }: TeamSectionProps) {
  const { t } = useTranslation('portal')
  const queryClient = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferTarget, setTransferTarget] = useState<TeamMember | null>(null)

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

  // Non-owner: read-only view of own entry only
  if (!isOwner) {
    const ownEntry = members.find((m) => !m.isOwner)
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">
          {t('settings.team.title')}
        </h2>
        {ownEntry && (
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)]">
            <div className="flex items-center gap-3">
              <Users size={18} className="text-[var(--color-text-muted)]" />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {ownEntry.name}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t(ROLE_LABELS[ownEntry.role])}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Owner: full team management
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">
          {t('settings.team.title')}
        </h2>
        <Button
          onPress={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
        >
          <UserPlus size={16} />
          {t('settings.team.inviteMember')}
        </Button>
      </div>

      {/* Team table */}
      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-xs font-medium text-[var(--color-text-muted)]">
                {member.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {member.name}
                  </span>
                  {member.isOwner && (
                    <span className="px-1.5 py-0.5 rounded-sm text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      {t('settings.team.owner')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {member.email}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t('settings.team.joined')}:{' '}
                  <span className="font-mono">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </span>
                </p>
              </div>
            </div>

            {/* Role change + Remove (hidden for owner's own row) */}
            {!member.isOwner && (
              <div className="flex items-center gap-2">
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
                  <Button className="px-2 py-1 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text)] cursor-pointer outline-none focus:border-[var(--color-primary)]">
                    <SelectValue />
                  </Button>
                  <Popover className="w-40 rounded-xl border border-[var(--color-border)] bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-lg">
                    <ListBox className="p-1">
                      {ROLES.map((role) => (
                        <ListBoxItem
                          key={role}
                          id={role}
                          textValue={t(ROLE_LABELS[role])}
                          className="px-3 py-2 text-xs text-[var(--color-text)] rounded-lg cursor-pointer outline-none hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)] data-[selected]:text-[var(--color-primary)] data-[selected]:font-medium"
                        >
                          {t(ROLE_LABELS[role])}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Popover>
                </Select>

                <Button
                  onPress={() => setRemovingMember(member)}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]"
                  aria-label={t('settings.team.removeMember')}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Transfer Ownership link */}
      <Button
        onPress={() => setShowTransfer(true)}
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
      >
        <ArrowRightLeft size={14} />
        {t('settings.team.transferOwnership')}
      </Button>

      {/* Invite Dialog */}
      {showInvite && (
        <InviteDialog
          onClose={() => setShowInvite(false)}
        />
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
// Invite Dialog — email + role, sends magic link
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
        className="w-full max-w-md mx-4 rounded-2xl bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-[var(--color-border)] shadow-xl"
      >
        <Dialog className="p-6 outline-none">
          <Heading slot="title" className="text-lg font-semibold text-[var(--color-text)] mb-4">
            {t('settings.team.inviteMember')}
          </Heading>

          <form onSubmit={onSubmit} className="space-y-4">
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
                  className="space-y-1"
                >
                  <Label className="text-sm text-[var(--color-text-muted)]">
                    {t('settings.team.email')}
                  </Label>
                  <Input
                    placeholder="colleague@company.com"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
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
                  className="space-y-1"
                >
                  <Label className="text-sm text-[var(--color-text-muted)]">
                    {t('settings.team.role')}
                  </Label>
                  <Button className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] cursor-pointer outline-none focus:border-[var(--color-primary)]">
                    <SelectValue />
                  </Button>
                  <Popover className="w-[var(--trigger-width)] rounded-xl border border-[var(--color-border)] bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-lg">
                    <ListBox className="p-1">
                      {ROLES.map((role) => (
                        <ListBoxItem
                          key={role}
                          id={role}
                          textValue={t(ROLE_LABELS[role])}
                          className="px-3 py-2 text-sm text-[var(--color-text)] rounded-lg cursor-pointer outline-none hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)] data-[selected]:text-[var(--color-primary)]"
                        >
                          {t(ROLE_LABELS[role])}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Popover>
                </Select>
              )}
            />

            <p className="text-xs text-[var(--color-text-muted)]">
              {t('settings.team.inviteNote')}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                onPress={onClose}
                className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                {t('settings.cancel')}
              </Button>
              <Button
                type="submit"
                isDisabled={inviteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-50"
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
        className="w-full max-w-sm mx-4 rounded-2xl bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-[var(--color-border)] shadow-xl"
      >
        <Dialog className="p-6 outline-none">
          <Heading slot="title" className="text-lg font-semibold text-[var(--color-text)] mb-2">
            {t('settings.team.removeConfirm', { name: member.name })}
          </Heading>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              onPress={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              {t('settings.cancel')}
            </Button>
            <Button
              onPress={onConfirm}
              isDisabled={isPending}
              className="px-4 py-2 rounded-lg bg-[var(--color-error)] text-white text-sm font-medium cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-error)] focus-visible:ring-offset-2 disabled:opacity-50"
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
// Transfer Ownership Dialog — requires OTP
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
        className="w-full max-w-md mx-4 rounded-2xl bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-[var(--color-border)] shadow-xl"
      >
        <Dialog className="p-6 outline-none">
          <Heading slot="title" className="text-lg font-semibold text-[var(--color-text)] mb-4">
            {t('settings.team.transferOwnership')}
          </Heading>

          <div className="space-y-4">
            <Select
              selectedKey={selectedMemberId}
              onSelectionChange={(key) =>
                setSelectedMemberId(key as string)
              }
              className="space-y-1"
            >
              <Label className="text-sm text-[var(--color-text-muted)]">
                {t('settings.team.transferTo')}
              </Label>
              <Button className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] cursor-pointer outline-none focus:border-[var(--color-primary)]">
                <SelectValue />
              </Button>
              <Popover className="w-[var(--trigger-width)] rounded-xl border border-[var(--color-border)] bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-lg">
                <ListBox className="p-1">
                  {members.map((m) => (
                    <ListBoxItem
                      key={m.id}
                      id={m.id}
                      textValue={m.name}
                      className="px-3 py-2 text-sm text-[var(--color-text)] rounded-lg cursor-pointer outline-none hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)]"
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
              className="space-y-1"
            >
              <Label className="text-sm text-[var(--color-text-muted)]">
                {t('settings.team.otpCode')}
              </Label>
              <Input
                placeholder="000000"
                maxLength={6}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] font-mono text-center tracking-widest outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </TextField>

            <p className="text-xs text-[var(--color-warning)]">
              {t('settings.team.transferWarning')}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                onPress={onClose}
                className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
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
                className="px-4 py-2 rounded-lg bg-[var(--color-error)] text-white text-sm font-medium cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-error)] focus-visible:ring-offset-2 disabled:opacity-50"
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
