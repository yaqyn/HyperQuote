import { useState, useMemo } from 'react'
import { SearchField, Input, Dialog, DialogTrigger, Modal, ModalOverlay, Heading } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserList, createUser, suspendUser, activateUser, resetUserPassword, toggleUserMFA } from '../../../lib/server/admin'
import { useAdminStore } from '../../../stores/admin'
import { Button } from '../../ui/Button'
import { UnderlineInput } from '../../ui/UnderlineInput'
import { Toggle } from '../../ui/Toggle'
import type { UserRecord } from '../../../types/admin'

/**
 * UserList — "The Directory"
 * Dense list: name + email (mono) + role badges (tiny pills) + last active (mono) + status dot.
 * Inline edit on double-click for role changes.
 * Search + role filter as pills at top.
 *
 * Active users listed first, suspended at the bottom (grayed out).
 * Unauthorized elements are HIDDEN, not disabled.
 */

const ROLE_FILTERS = ['all', 'admin', 'sales_manager', 'sales_rep', 'procurement_manager', 'warehouse_manager', 'finance_manager', 'dispatcher'] as const

const ROLE_OPTIONS = ['admin', 'sales_manager', 'sales_rep', 'procurement_manager', 'procurement_agent', 'warehouse_manager', 'warehouse_staff', 'finance_manager', 'accountant', 'dispatcher', 'driver_manager', 'hr_manager', 'support_agent', 'it_admin']
const DEPARTMENT_OPTIONS = ['Sales', 'Procurement', 'Warehouse', 'Finance', 'Dispatch', 'HR', 'IT', 'Support', 'Operations']

const STATUS_ORDER: Record<string, number> = { active: 0, inactive: 1, suspended: 2 }

export function UserList() {
  const { t } = useTranslation('admin')
  const selectedUserId = useAdminStore((s) => s.selectedUserId)
  const setSelectedUserId = useAdminStore((s) => s.setSelectedUserId)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const { data: users } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => getUserList(),
    staleTime: 30_000,
  })

  const filteredUsers = useMemo(() => {
    const filtered = (users ?? []).filter((u) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
      }
      if (roleFilter !== 'all' && !u.roles.includes(roleFilter)) return false
      return true
    })

    // Active first, then inactive, then suspended at bottom
    return filtered.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))
  }, [users, searchQuery, roleFilter])

  return (
    <div className="p-5 space-y-4">
      {/* Search + Role Filter Pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          aria-label={t('users.searchPlaceholder', 'Search users...')}
          className="w-full max-w-xs"
        >
          <Input
            placeholder={t('users.searchPlaceholder', 'Search users...')}
            className="w-full rounded-lg border border-black/8 dark:border-white/8 bg-transparent px-3 py-2 text-sm outline-none data-[focused]:border-black/20 dark:data-[focused]:border-white/20 placeholder:text-black/25 dark:placeholder:text-white/25"
          />
        </SearchField>

        <div className="flex items-center gap-1">
          {ROLE_FILTERS.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                roleFilter === role
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60'
              }`}
            >
              {role === 'all' ? 'All' : role.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <Button
          variant="outline"
          onPress={() => useAdminStore.getState().setEditingRoleId('__all__')}
        >
          {t('users.editPermissions', 'Edit Permissions')}
        </Button>

        <Button variant="primary" onPress={() => setAddDialogOpen(true)}>
          {t('users.addUser', 'Add User')}
        </Button>
      </div>

      {/* Dense Directory List */}
      <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1.2fr_1fr_100px_80px_60px] gap-3 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35 border-b border-black/6 dark:border-white/6">
          <span>{t('users.name', 'Name')}</span>
          <span>{t('users.email', 'Email')}</span>
          <span>{t('users.roles', 'Roles')}</span>
          <span>{t('users.lastLogin', 'Last Active')}</span>
          <span>{t('users.mfa', 'MFA')}</span>
          <span />
        </div>

        {/* Rows */}
        <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
          {filteredUsers.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              isSelected={selectedUserId === user.id}
              onSelect={() => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
            />
          ))}
          {filteredUsers.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-black/25 dark:text-white/25">
              No users found
            </div>
          )}
        </div>
      </div>

      {/* Add User Dialog */}
      <AddUserDialog isOpen={addDialogOpen} onClose={() => setAddDialogOpen(false)} />
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────

function UserRow({
  user,
  isSelected,
  onSelect,
}: {
  user: UserRecord
  isSelected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const isSuspended = user.status === 'suspended'

  const suspendMutation = useMutation({
    mutationFn: (reason: string) => suspendUser({ data: { userId: user.id, reason } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); setSuspendDialogOpen(false) },
  })

  const activateMutation = useMutation({
    mutationFn: () => activateUser({ data: { userId: user.id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const statusDot = {
    active: 'bg-green-500',
    suspended: 'bg-red-500',
    inactive: 'bg-black/20 dark:bg-white/20',
  }[user.status] ?? 'bg-black/20'

  return (
    <>
      <div
        className={`grid grid-cols-[1fr_1.2fr_1fr_100px_80px_60px] gap-3 items-center px-4 py-2.5 cursor-pointer transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ${
          isSelected ? 'bg-black/[0.03] dark:bg-white/[0.03]' : ''
        } ${isSuspended ? 'opacity-40' : ''}`}
        onClick={onSelect}
      >
        {/* Name + status dot */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
          <span className="text-sm font-medium truncate">{user.name}</span>
        </div>

        {/* Email — mono */}
        <span className="text-sm font-[family-name:var(--font-geist-mono)] text-black/50 dark:text-white/50 truncate">
          {user.email}
        </span>

        {/* Role pills — tiny */}
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role) => (
            <span
              key={role}
              className="rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-black/50 dark:text-white/50"
            >
              {role.replace(/_/g, ' ')}
            </span>
          ))}
        </div>

        {/* Last active — mono */}
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
          {new Date(user.lastLogin).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
        </span>

        {/* MFA */}
        <span className={`text-xs ${user.mfaEnabled ? 'text-green-600 dark:text-green-400' : 'text-black/20 dark:text-white/20'}`}>
          {user.mfaEnabled ? 'On' : 'Off'}
        </span>

        {/* Action */}
        <div onClick={(e) => e.stopPropagation()}>
          {user.status === 'active' ? (
            <Button
              variant="ghost"
              className="!text-[11px] !text-red-600/70 data-[hovered]:!text-red-600"
              onPress={() => setSuspendDialogOpen(true)}
            >
              {t('users.suspend', 'Suspend')}
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="!text-[11px] !text-green-600/70 data-[hovered]:!text-green-600"
              onPress={() => activateMutation.mutate()}
            >
              {t('users.activate', 'Activate')}
            </Button>
          )}
        </div>
      </div>

      {/* Inline detail panel */}
      {isSelected && (
        <div className="px-4 py-4 bg-black/[0.015] dark:bg-white/[0.015] border-t border-black/[0.04] dark:border-white/[0.04]">
          <UserDetailPanel user={user} />
        </div>
      )}

      {/* Suspend Dialog */}
      <SuspendDialog
        isOpen={suspendDialogOpen}
        onClose={() => setSuspendDialogOpen(false)}
        onConfirm={(reason) => suspendMutation.mutate(reason)}
        isPending={suspendMutation.isPending}
        userName={user.name}
      />
    </>
  )
}

// ─── Detail Panel ────────────────────────────────────────

function UserDetailPanel({ user }: { user: UserRecord }) {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const resetMutation = useMutation({
    mutationFn: () => resetUserPassword({ data: { userId: user.id } }),
    onSuccess: (result) => {
      setTempPassword(result.tempPassword)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const mfaMutation = useMutation({
    mutationFn: (enabled: boolean) => toggleUserMFA({ data: { userId: user.id, enabled } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const statusLabel = {
    active: 'Active',
    suspended: 'Suspended',
    inactive: 'Inactive',
  }[user.status] ?? user.status

  const statusColor = {
    active: 'text-green-600 dark:text-green-400',
    suspended: 'text-red-600 dark:text-red-400',
    inactive: 'text-black/35 dark:text-white/35',
  }[user.status] ?? ''

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 max-w-3xl">
      {/* Column 1: Actionable info first — role, status, last login */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
          {t('users.statusOverview', 'Status')}
        </span>
        <div className="space-y-1.5 text-sm">
          <DetailRow label={t('users.status', 'Status')} value={statusLabel} valueClassName={statusColor} />
          <DetailRow
            label={t('users.lastLogin', 'Last Login')}
            value={new Date(user.lastLogin).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            mono
          />
          <DetailRow
            label={t('users.createdAt', 'Created')}
            value={new Date(user.createdAt).toLocaleDateString('en-GB')}
            mono
          />
          <DetailRow label={t('users.id', 'ID')} value={user.id} mono />
        </div>
      </div>

      {/* Column 2: Roles */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
          {t('users.assignedRoles', 'Roles')}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {user.roles.map((role) => (
            <span
              key={role}
              className="rounded-full border border-[#2563EB]/15 bg-[#2563EB]/5 px-2.5 py-1 text-xs font-medium text-[#2563EB]"
            >
              {role.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Column 3: Actions */}
      <div className="space-y-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
          {t('users.actions', 'Actions')}
        </span>
        <div className="space-y-2">
          {/* MFA Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-black/50 dark:text-white/50">MFA</span>
            <Toggle
              isSelected={user.mfaEnabled}
              onChange={(val) => mfaMutation.mutate(val)}
            />
          </div>

          {/* Reset Password */}
          <Button
            variant="outline"
            className="w-full !text-xs"
            onPress={() => { setTempPassword(null); setResetDialogOpen(true) }}
          >
            {t('users.resetPassword', 'Reset Password')}
          </Button>
        </div>
      </div>

      {/* Reset Password Dialog */}
      <ModalOverlay
        isOpen={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        isDismissable
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      >
        <Modal className="w-full max-w-sm rounded-2xl bg-white/90 dark:bg-black/90 border border-black/6 dark:border-white/6 p-6 shadow-xl">
          <Dialog className="outline-none" isKeyboardDismissDisabled>
            {({ close }) => (
              <div className="space-y-4">
                <Heading slot="title" className="text-sm font-semibold">
                  {t('users.resetPassword', 'Reset Password')}
                </Heading>
                {tempPassword ? (
                  <div className="space-y-3">
                    <p className="text-xs text-black/50 dark:text-white/50">
                      Temporary password generated for {user.name}:
                    </p>
                    <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.03] p-3">
                      <span className="font-[family-name:var(--font-geist-mono)] text-sm select-all">
                        {tempPassword}
                      </span>
                    </div>
                    <Button variant="primary" onPress={close} className="w-full">
                      Done
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-black/50 dark:text-white/50">
                      Generate a new temporary password for {user.name}?
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onPress={close} className="flex-1">
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onPress={() => resetMutation.mutate()}
                        isDisabled={resetMutation.isPending}
                        className="flex-1"
                      >
                        {resetMutation.isPending ? 'Resetting...' : 'Reset'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  )
}

// ─── Add User Dialog ────────────────────────────────────

function AddUserDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(ROLE_OPTIONS[0]!)
  const [department, setDepartment] = useState(DEPARTMENT_OPTIONS[0]!)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => createUser({ data: { name, email, role, department } }),
    onSuccess: (result) => {
      setTempPassword(result.tempPassword)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const handleClose = () => {
    setName('')
    setEmail('')
    setRole(ROLE_OPTIONS[0]!)
    setDepartment(DEPARTMENT_OPTIONS[0]!)
    setTempPassword(null)
    onClose()
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) handleClose() }}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
    >
      <Modal className="w-full max-w-md rounded-2xl bg-white/90 dark:bg-black/90 border border-black/6 dark:border-white/6 p-6 shadow-xl">
        <Dialog className="outline-none" isKeyboardDismissDisabled>
          {({ close }) => (
            <div className="space-y-5">
              <Heading slot="title" className="text-sm font-semibold">
                {t('users.addUser', 'Add User')}
              </Heading>

              {tempPassword ? (
                <div className="space-y-3">
                  <p className="text-xs text-black/50 dark:text-white/50">
                    User created. Temporary password:
                  </p>
                  <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.03] p-3">
                    <span className="font-[family-name:var(--font-geist-mono)] text-sm select-all">
                      {tempPassword}
                    </span>
                  </div>
                  <Button variant="primary" onPress={handleClose} className="w-full">
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <UnderlineInput label="Name" value={name} onChange={setName} placeholder="Full name" />
                  <UnderlineInput label="Email" value={email} onChange={setEmail} placeholder="user@hyperquote.io" />

                  <div className="space-y-1">
                    <span className="text-[11px] text-black/35 dark:text-white/35">Role</span>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full border-b border-black/[0.04] bg-transparent py-1.5 text-[13px] outline-none dark:border-white/[0.04] cursor-pointer"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-black/35 dark:text-white/35">Department</span>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full border-b border-black/[0.04] bg-transparent py-1.5 text-[13px] outline-none dark:border-white/[0.04] cursor-pointer"
                    >
                      {DEPARTMENT_OPTIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onPress={handleClose} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onPress={() => mutation.mutate()}
                      isDisabled={!name || !email || mutation.isPending}
                      className="flex-1"
                    >
                      {mutation.isPending ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

// ─── Suspend Dialog ─────────────────────────────────────

function SuspendDialog({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  userName,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  isPending: boolean
  userName: string
}) {
  const { t } = useTranslation('admin')
  const [reason, setReason] = useState('')

  const handleClose = () => {
    setReason('')
    onClose()
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) handleClose() }}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
    >
      <Modal className="w-full max-w-sm rounded-2xl bg-white/90 dark:bg-black/90 border border-black/6 dark:border-white/6 p-6 shadow-xl">
        <Dialog className="outline-none" isKeyboardDismissDisabled>
          {() => (
            <div className="space-y-4">
              <Heading slot="title" className="text-sm font-semibold">
                {t('users.suspendUser', 'Suspend User')}
              </Heading>
              <p className="text-xs text-black/50 dark:text-white/50">
                Suspend access for {userName}. They will not be able to log in.
              </p>
              <UnderlineInput
                label="Reason"
                value={reason}
                onChange={setReason}
                placeholder="Reason for suspension..."
              />
              <div className="flex gap-2">
                <Button variant="outline" onPress={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={() => { onConfirm(reason); setReason('') }}
                  isDisabled={!reason || isPending}
                  className="flex-1 !bg-red-600 data-[hovered]:!bg-red-700"
                >
                  {isPending ? 'Suspending...' : 'Suspend'}
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

// ─── Helpers ────────────────────────────────────────────

function DetailRow({ label, value, mono, valueClassName }: { label: string; value: string; mono?: boolean; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-black/35 dark:text-white/35 text-xs">{label}</span>
      <span className={`text-xs ${mono ? 'font-[family-name:var(--font-geist-mono)] tabular-nums' : ''} ${valueClassName ?? ''}`}>
        {value}
      </span>
    </div>
  )
}
