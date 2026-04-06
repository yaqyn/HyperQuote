import { useState } from 'react'
import { SearchField, Input, Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getUserList } from '../../../lib/server/admin'
import { useAdminStore } from '../../../stores/admin'
import type { UserRecord } from '../../../types/admin'

/**
 * User management table with search, status badges, MFA indicators.
 * Click row to expand inline detail panel.
 * Unauthorized elements are HIDDEN, not disabled — if user lacks permission,
 * the element doesn't render. (Currently all shown for admin role.)
 */
export function UserList() {
  const { t } = useTranslation('admin')
  const selectedUserId = useAdminStore((s) => s.selectedUserId)
  const setSelectedUserId = useAdminStore((s) => s.setSelectedUserId)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: users } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => getUserList(),
    staleTime: 30_000,
  })

  const filteredUsers = (users ?? []).filter((u) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('users.title', 'User Management')}</h2>
        <Button
          className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 cursor-pointer outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
        >
          {t('users.addUser', 'Add User')}
        </Button>
      </div>

      {/* Search */}
      <SearchField
        value={searchQuery}
        onChange={setSearchQuery}
        aria-label={t('users.searchPlaceholder', 'Search by name or email...')}
        className="w-full max-w-md"
      >
        <Input
          placeholder={t('users.searchPlaceholder', 'Search by name or email...')}
          className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-4 py-2.5 text-sm outline-none data-[focused]:ring-2 data-[focused]:ring-[#2563EB]/50"
        />
      </SearchField>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10">
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('users.name', 'Name')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('users.email', 'Email')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('users.roles', 'Roles')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('users.status', 'Status')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('users.lastLogin', 'Last Login')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('users.mfa', 'MFA')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50" />
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isSelected={selectedUserId === user.id}
                onSelect={() => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
              />
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-black/40 dark:text-white/40">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────

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

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    inactive: 'bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40',
  }

  const statusLabel: Record<string, string> = {
    active: t('users.active', 'Active'),
    suspended: t('users.suspended', 'Suspended'),
    inactive: t('users.inactive', 'Inactive'),
  }

  return (
    <>
      <tr
        className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
        onClick={onSelect}
      >
        <td className="px-4 py-3 font-medium">{user.name}</td>
        <td className="px-4 py-3 text-black/60 dark:text-white/60">{user.email}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {user.roles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-xs font-medium text-[#2563EB]"
              >
                {role.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[user.status] ?? ''}`}>
            {statusLabel[user.status] ?? user.status}
          </span>
        </td>
        <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
          {new Date(user.lastLogin).toLocaleDateString()}
        </td>
        <td className="px-4 py-3">
          {user.mfaEnabled ? (
            <span className="text-green-600 dark:text-green-400" title={t('users.mfaEnabled', 'Enabled')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </span>
          ) : (
            <span className="text-black/30 dark:text-white/30" title={t('users.mfaDisabled', 'Disabled')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285ZM12 15.75h.008v.008H12v-.008Z" />
              </svg>
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {user.status === 'active' ? (
            <Button
              className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer outline-none"
              onPress={(e) => { e.continuePropagation?.(); /* suspend user */ }}
            >
              {t('users.suspend', 'Suspend')}
            </Button>
          ) : (
            <Button
              className="rounded-md px-2 py-1 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer outline-none"
              onPress={(e) => { e.continuePropagation?.(); /* activate user */ }}
            >
              {t('users.activate', 'Activate')}
            </Button>
          )}
        </td>
      </tr>

      {/* Inline detail panel */}
      {isSelected && (
        <tr>
          <td colSpan={7} className="px-4 py-4 bg-black/[0.02] dark:bg-white/[0.02]">
            <UserDetailPanel user={user} />
          </td>
        </tr>
      )}
    </>
  )
}

function UserDetailPanel({ user }: { user: UserRecord }) {
  const { t } = useTranslation('admin')

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Profile Info */}
      <div>
        <h4 className="text-sm font-semibold mb-3">{t('users.userDetail', 'User Details')}</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-black/50 dark:text-white/50">{t('users.name', 'Name')}</span>
            <span>{user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black/50 dark:text-white/50">{t('users.email', 'Email')}</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black/50 dark:text-white/50">{t('users.createdAt', 'Created')}</span>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-black/50 dark:text-white/50">{t('users.mfa', 'MFA')}</span>
            <span>{user.mfaEnabled ? t('users.mfaEnabled', 'Enabled') : t('users.mfaDisabled', 'Disabled')}</span>
          </div>
        </div>
      </div>

      {/* Assigned Roles */}
      <div>
        <h4 className="text-sm font-semibold mb-3">{t('users.assignedRoles', 'Assigned Roles')}</h4>
        <div className="flex flex-wrap gap-2">
          {user.roles.map((role) => (
            <span
              key={role}
              className="rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/5 px-3 py-1 text-xs font-medium text-[#2563EB]"
            >
              {role.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-black/40 dark:text-white/40 italic">
          {t('users.permissionSet', 'Permission Set (derived from roles)')}
        </p>
      </div>
    </div>
  )
}
