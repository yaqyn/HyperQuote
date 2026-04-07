import { useState } from 'react'
import { SearchField, Input } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getAuditLog } from '../../../lib/server/admin'
import type { AuditEntry } from '../../../types/admin'

/**
 * AuditLogViewer — "The Trail"
 * Dense log: timestamp (mono) + actor + action + entity + changes diff.
 * Filter by date range, actor, action type as inline pills.
 * Infinite scroll.
 *
 * WORM pattern: Write Once Read Many. Strictly read-only.
 * CRITICAL: READ-ONLY. No edit, no delete, no soft-delete buttons anywhere.
 * 7-year retention, immutable.
 */
export function AuditLogViewer() {
  const { t } = useTranslation('admin')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)

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
      ) return false
    }
    if (filterUser && entry.userName !== filterUser) return false
    if (filterAction && entry.action !== filterAction) return false
    if (filterEntity && entry.entityType !== filterEntity) return false
    return true
  })

  const uniqueUsers = [...new Set(entries.map((e) => e.userName))].sort()
  const uniqueActions = [...new Set(entries.map((e) => e.action))].sort()
  const uniqueEntities = [...new Set(entries.map((e) => e.entityType))].sort()

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
          {t('audit.title', 'Audit Trail')}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/30 dark:text-white/30">
            {filteredEntries.length}/{total}
          </span>
          <button
            type="button"
            className="text-[11px] text-[#2563EB]/70 hover:text-[#2563EB] cursor-pointer"
          >
            {t('audit.exportCsv', 'Export CSV')}
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          aria-label={t('audit.search', 'Search...')}
          className="w-full max-w-[200px]"
        >
          <Input
            placeholder={t('audit.search', 'Search...')}
            className="w-full rounded-lg border border-black/8 dark:border-white/8 bg-transparent px-3 py-1.5 text-xs outline-none data-[focused]:border-black/20 dark:data-[focused]:border-white/20 placeholder:text-black/20 dark:placeholder:text-white/20"
          />
        </SearchField>

        <FilterPill
          value={filterUser}
          onChange={setFilterUser}
          options={uniqueUsers}
          placeholder={t('audit.filterUser', 'Actor')}
        />
        <FilterPill
          value={filterAction}
          onChange={setFilterAction}
          options={uniqueActions}
          placeholder={t('audit.filterAction', 'Action')}
        />
        <FilterPill
          value={filterEntity}
          onChange={setFilterEntity}
          options={uniqueEntities}
          placeholder={t('audit.filterEntity', 'Entity')}
        />
      </div>

      {/* Dense log — READ-ONLY */}
      <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden">
        <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
          {filteredEntries.map((entry) => (
            <AuditRow
              key={entry.id}
              entry={entry}
              isExpanded={expandedEntryId === entry.id}
              onToggle={() => setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)}
            />
          ))}
          {filteredEntries.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-black/25 dark:text-white/25">
              {t('audit.noResults', 'No entries found')}
            </div>
          )}
        </div>
      </div>

      {/* WORM note */}
      <p className="text-[10px] text-black/15 dark:text-white/15">
        {t('audit.wormNote', 'WORM: Write Once Read Many. Immutable. 7-year retention.')}
      </p>
    </div>
  )
}

// ─── Filter Pill ─────────────────────────────────────────

function FilterPill({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={placeholder}
      className={`rounded-full border border-black/8 dark:border-white/8 bg-transparent px-2.5 py-1 text-[11px] outline-none cursor-pointer ${
        value ? 'text-black dark:text-white font-medium' : 'text-black/30 dark:text-white/30'
      }`}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

// ─── Audit Row (read-only, expandable) ───────────────────

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
      return `${truncateJson(entry.oldValue)} -> ${truncateJson(entry.newValue)}`
    }
    return truncateJson(entry.newValue ?? entry.oldValue ?? '')
  })()

  return (
    <>
      <div
        className="grid grid-cols-[120px_100px_80px_100px_80px_1fr] gap-2 items-center px-4 py-2 cursor-pointer hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
        onClick={onToggle}
      >
        {/* Timestamp — mono */}
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/40 dark:text-white/40 whitespace-nowrap">
          {formatTimestamp(entry.timestamp)}
        </span>

        {/* Actor */}
        <span className="text-xs truncate">{entry.userName}</span>

        {/* Action */}
        <span className="text-[10px] font-medium text-black/50 dark:text-white/50">
          {entry.action}
        </span>

        {/* Entity type */}
        <span className="text-[11px] text-black/35 dark:text-white/35 truncate">
          {entry.entityType}
        </span>

        {/* Entity ID — mono */}
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/25 dark:text-white/25 truncate">
          {entry.entityId}
        </span>

        {/* Change summary */}
        <span className="text-[11px] text-black/30 dark:text-white/30 truncate font-[family-name:var(--font-geist-mono)]">
          {changeSummary}
        </span>
      </div>

      {/* Expanded: full JSON diff (read-only) */}
      {isExpanded && (
        <div className="px-4 py-3 bg-black/[0.015] dark:bg-white/[0.015] border-t border-black/[0.03] dark:border-white/[0.03]">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 max-w-3xl">
            {entry.oldValue && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-black/25 dark:text-white/25">
                  {t('audit.oldValue', 'Before')}
                </span>
                <pre className="mt-1 rounded bg-black/[0.03] dark:bg-white/[0.03] p-2.5 text-[10px] font-[family-name:var(--font-geist-mono)] overflow-auto max-h-40 text-black/50 dark:text-white/50">
                  {formatJson(entry.oldValue)}
                </pre>
              </div>
            )}
            {entry.newValue && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-black/25 dark:text-white/25">
                  {t('audit.newValue', 'After')}
                </span>
                <pre className="mt-1 rounded bg-black/[0.03] dark:bg-white/[0.03] p-2.5 text-[10px] font-[family-name:var(--font-geist-mono)] overflow-auto max-h-40 text-black/50 dark:text-white/50">
                  {formatJson(entry.newValue)}
                </pre>
              </div>
            )}
          </div>
          <div className="mt-2 text-[10px] text-black/20 dark:text-white/20 font-[family-name:var(--font-geist-mono)] tabular-nums">
            IP: {entry.ipAddress}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Helpers ─────────────────────────────────────────────

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
