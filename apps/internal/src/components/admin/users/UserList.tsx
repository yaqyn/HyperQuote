import { useState } from 'react'
import { SearchField, Input, Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getUserList } from '../../../lib/server/admin'
import { useAdminStore } from '../../../stores/admin'
import type { UserRecord } from '../../../types/admin'

/**
 * UserList — "The Directory"
 * Dense list: name + email (mono) + role badges (tiny pills) + last active (mono) + status dot.
 * Inline edit on double-click for role changes.
 * Search + role filter as pills at top.
 *
 * Unauthorized elements are HIDDEN, not disabled.
 */

const ROLE_FILTERS = ['all', 'admin', 'sales_manager', 'sales_rep', 'procurement_manager', 'warehouse_manager', 'finance_manager', 'dispatcher'] as const

export function UserList() {
  const { t } = useTranslation('admin')
  const selectedUserId = useAdminStore((s) => s.selectedUserId)
  const setSelectedUserId = useAdminStore((s) => s.setSelectedUserId)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const { data: users } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => getUserList(),
    staleTime: 30_000,
  })

  const filteredUsers = (users ?? []).filter((u) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    }
    if (roleFilter !== 'all' && !u.roles.includes(roleFilter)) return false
    return true
  })

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
          onPress={() => useAdminStore.getState().setEditingRoleId('__all__')}
          className="rounded-lg border border-black/8 dark:border-white/8 px-3.5 py-1.5 text-xs font-medium text-black/60 dark:text-white/60 hover:text-black/80 dark:hover:text-white/80 cursor-pointer outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
        >
          {t('users.editPermissions', 'Edit Permissions')}
        </Button>

        <Button className="rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#2563EB]/90 cursor-pointer outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50">
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
        }`}
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
        <div>
          {user.status === 'active' ? (
            <Button
              className="text-[11px] text-red-600/70 hover:text-red-600 cursor-pointer outline-none"
              onPress={(e) => { e.continuePropagation?.() }}
            >
              {t('users.suspend', 'Suspend')}
            </Button>
          ) : (
            <Button
              className="text-[11px] text-green-600/70 hover:text-green-600 cursor-pointer outline-none"
              onPress={(e) => { e.continuePropagation?.() }}
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
    </>
  )
}

// ─── Detail Panel ────────────────────────────────────────

function UserDetailPanel({ user }: { user: UserRecord }) {
  const { t } = useTranslation('admin')

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 max-w-2xl">
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
          {t('users.userDetail', 'Details')}
        </span>
        <div className="space-y-1.5 text-sm">
          <DetailRow label={t('users.email', 'Email')} value={user.email} mono />
          <DetailRow
            label={t('users.createdAt', 'Created')}
            value={new Date(user.createdAt).toLocaleDateString('en-GB')}
            mono
          />
          <DetailRow
            label={t('users.mfa', 'MFA')}
            value={user.mfaEnabled ? t('users.mfaEnabled', 'Enabled') : t('users.mfaDisabled', 'Disabled')}
          />
        </div>
      </div>

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
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-black/35 dark:text-white/35 text-xs">{label}</span>
      <span className={`text-xs ${mono ? 'font-[family-name:var(--font-geist-mono)] tabular-nums' : ''}`}>
        {value}
      </span>
    </div>
  )
}
