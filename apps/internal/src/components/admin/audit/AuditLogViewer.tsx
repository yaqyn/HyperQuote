import { useState } from 'react'
import { SearchField, Input, Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getAuditLog } from '../../../lib/server/admin'
import type { AuditEntry } from '../../../types/admin'

/**
 * WORM pattern: Write Once Read Many. This viewer is strictly read-only.
 * Audit entries are created by database triggers, never by this UI.
 *
 * CRITICAL: READ-ONLY. No edit, no delete, no soft-delete buttons anywhere.
 * 7-year retention, immutable.
 *
 * Features: search, filter, paginate, export (CSV mock).
 */
export function AuditLogViewer() {
  const { t } = useTranslation('admin')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const [exportToast, setExportToast] = useState(false)

  const { data: auditData } = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => getAuditLog(),
    staleTime: 15_000,
  })

  const entries = auditData?.entries ?? []
  const total = auditData?.total ?? 0

  // Client-side filtering (server-side in production)
  const filteredEntries = entries.filter((entry) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (
        !entry.action.toLowerCase().includes(q) &&
        !entry.entityType.toLowerCase().includes(q) &&
        !entry.userName.toLowerCase().includes(q)
      ) {
        return false
      }
    }
    if (filterUser && entry.userName !== filterUser) return false
    if (filterAction && entry.action !== filterAction) return false
    if (filterEntity && entry.entityType !== filterEntity) return false
    return true
  })

  // Unique values for filter dropdowns
  const uniqueUsers = [...new Set(entries.map((e) => e.userName))].sort()
  const uniqueActions = [...new Set(entries.map((e) => e.action))].sort()
  const uniqueEntities = [...new Set(entries.map((e) => e.entityType))].sort()

  const handleExport = () => {
    setExportToast(true)
    setTimeout(() => setExportToast(false), 3000)
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('audit.title', 'Audit Log')}</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-black/50 dark:text-white/50">
            {t('audit.showing', 'Showing')}{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{filteredEntries.length}</span>{' '}
            {t('audit.of', 'of')}{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{total}</span>{' '}
            {t('audit.entries', 'entries')}
          </span>
          <Button
            onPress={handleExport}
            className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer outline-none"
          >
            {t('audit.exportCsv', 'Export CSV')}
          </Button>
        </div>
      </div>

      {/* Export toast */}
      {exportToast && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-2 text-sm text-green-700 dark:text-green-400">
          {t('audit.exportStarted', 'Export started')}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          aria-label={t('audit.search', 'Search audit log...')}
          className="w-full max-w-xs"
        >
          <Input
            placeholder={t('audit.search', 'Search audit log...')}
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-4 py-2 text-sm outline-none data-[focused]:ring-2 data-[focused]:ring-[#2563EB]/50"
          />
        </SearchField>

        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          aria-label={t('audit.filterUser', 'Filter by user')}
          className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-2 text-sm outline-none"
        >
          <option value="">{t('audit.filterUser', 'Filter by user')}</option>
          {uniqueUsers.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          aria-label={t('audit.filterAction', 'Filter by action')}
          className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-2 text-sm outline-none"
        >
          <option value="">{t('audit.filterAction', 'Filter by action')}</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          aria-label={t('audit.filterEntity', 'Filter by entity type')}
          className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-2 text-sm outline-none"
        >
          <option value="">{t('audit.filterEntity', 'Filter by entity type')}</option>
          {uniqueEntities.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {/* Table — READ-ONLY, no edit/delete actions */}
      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10">
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('audit.timestamp', 'Timestamp')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('audit.user', 'User')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('audit.action', 'Action')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('audit.entityType', 'Entity Type')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('audit.entityId', 'Entity ID')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('audit.changeSummary', 'Change Summary')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <AuditRow
                key={entry.id}
                entry={entry}
                isExpanded={expandedEntryId === entry.id}
                onToggle={() => setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)}
              />
            ))}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-black/40 dark:text-white/40">
                  {t('audit.noResults', 'No audit entries found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* WORM note */}
      <p className="text-xs text-black/30 dark:text-white/30 italic">
        {t('audit.wormNote', 'WORM pattern: Write Once Read Many. This viewer is strictly read-only. Audit entries are created by database triggers, never by this UI.')}
      </p>
    </div>
  )
}

// ─── Audit Row (read-only, expandable) ──────────────────

function AuditRow({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: AuditEntry
  isExpanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation('admin')

  const changeSummary = (() => {
    if (!entry.oldValue && !entry.newValue) return '-'
    if (entry.oldValue && entry.newValue) {
      const old = truncateJson(entry.oldValue)
      const nw = truncateJson(entry.newValue)
      return `${old} -> ${nw}`
    }
    if (entry.newValue) return truncateJson(entry.newValue)
    return truncateJson(entry.oldValue ?? '')
  })()

  return (
    <>
      <tr
        className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60 whitespace-nowrap">
          {formatTimestamp(entry.timestamp)}
        </td>
        <td className="px-4 py-3">{entry.userName}</td>
        <td className="px-4 py-3">
          <span className="rounded-full bg-black/5 dark:bg-white/5 px-2 py-0.5 text-xs font-medium">
            {entry.action}
          </span>
        </td>
        <td className="px-4 py-3 text-black/60 dark:text-white/60">{entry.entityType}</td>
        <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/50 dark:text-white/50">
          {entry.entityId}
        </td>
        <td className="px-4 py-3 text-black/50 dark:text-white/50 max-w-xs truncate">
          {changeSummary}
        </td>
      </tr>

      {/* Expanded detail — full JSON values (read-only) */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {entry.oldValue && (
                <div>
                  <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 mb-2">
                    {t('audit.oldValue', 'Old Value')}
                  </h4>
                  <pre className="rounded-lg bg-black/5 dark:bg-white/5 p-3 text-xs font-[family-name:var(--font-geist-mono)] overflow-auto max-h-48">
                    {formatJson(entry.oldValue)}
                  </pre>
                </div>
              )}
              {entry.newValue && (
                <div>
                  <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 mb-2">
                    {t('audit.newValue', 'New Value')}
                  </h4>
                  <pre className="rounded-lg bg-black/5 dark:bg-white/5 p-3 text-xs font-[family-name:var(--font-geist-mono)] overflow-auto max-h-48">
                    {formatJson(entry.newValue)}
                  </pre>
                </div>
              )}
            </div>
            <div className="mt-3 text-xs text-black/40 dark:text-white/40">
              IP: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{entry.ipAddress}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Helpers ────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function truncateJson(json: string, maxLen = 40): string {
  try {
    const parsed = JSON.parse(json)
    const str = JSON.stringify(parsed)
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
  } catch {
    return json.length > maxLen ? json.slice(0, maxLen) + '...' : json
  }
}

function formatJson(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}
