import { useTranslation } from 'react-i18next'
import { AIShortcuts } from './AIShortcuts'
import { AIChatInterface } from './chat/AIChatInterface'

/**
 * Root AI assistant module.
 * Single-view — no tabs, just the chat interface.
 * Safety indicator bar at top shows read-only DB, draft-review-confirm, audit logged.
 */
export function AIModule() {
  const { t } = useTranslation('ai')

  return (
    <div className="flex flex-col h-full">
      <AIShortcuts />

      {/* ─── Safety Indicator Bar ──────────────────────── */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-black/5 dark:border-white/5">
        <SafetyBadge label={t('safety.readOnlyDb', 'Read-only DB')} />
        <SafetyBadge label={t('safety.draftReviewConfirm', 'Draft-Review-Confirm')} />
        <SafetyBadge label={t('safety.auditLogged', 'Audit Logged')} />
      </div>

      {/* ─── Chat Interface ───────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <AIChatInterface />
      </div>
    </div>
  )
}

function SafetyBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm bg-white/40 dark:bg-white/5 border border-black/5 dark:border-white/10 text-black/50 dark:text-white/50">
      <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
      </svg>
      {label}
    </span>
  )
}
