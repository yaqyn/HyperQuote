/**
 * ConversationHistory -- Elevated glass overlay with date-grouped conversation threads.
 *
 * React Aria Dialog + Modal for focus trapping and Escape dismissal.
 * isKeyboardDismissDisabled per CLAUDE.md.
 * Date grouping: Today, Yesterday, This Week, month names.
 * Thread click loads conversation and closes overlay.
 */
import { useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Dialog, DialogTrigger, Modal, ModalOverlay } from 'react-aria-components'
import { X, Pin } from 'lucide-react'
import { useChatStore, type Conversation } from '../../stores/chat'
import { usePortalStore } from '../../stores/portal'

// ============================================================================
// Helpers
// ============================================================================

type DateGroup = 'pinned' | 'today' | 'yesterday' | 'thisWeek' | string

function getDateGroup(dateStr: string, now: Date): DateGroup {
  const d = new Date(dateStr)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - today.getDay())

  if (d >= today) return 'today'
  if (d >= yesterday) return 'yesterday'
  if (d >= weekStart) return 'thisWeek'
  // Month name
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function groupConversations(
  conversations: Conversation[],
  now: Date,
): Map<DateGroup, Conversation[]> {
  const groups = new Map<DateGroup, Conversation[]>()
  const pinned = conversations.filter((c) => c.pinned)
  const unpinned = conversations.filter((c) => !c.pinned)

  if (pinned.length > 0) {
    groups.set('pinned', pinned)
  }

  for (const conv of unpinned) {
    const group = getDateGroup(conv.createdAt, now)
    const existing = groups.get(group) ?? []
    existing.push(conv)
    groups.set(group, existing)
  }

  return groups
}

function getGroupLabel(
  group: DateGroup,
  t: (key: string) => string,
): string {
  switch (group) {
    case 'pinned':
      return t('chat.historyPinned')
    case 'today':
      return t('chat.historyToday')
    case 'yesterday':
      return t('chat.historyYesterday')
    case 'thisWeek':
      return t('chat.historyThisWeek')
    default:
      return group // Month name fallback
  }
}

function getRelativeTime(dateStr: string, isArabic: boolean): string {
  const d = new Date(dateStr)
  const now = Date.now()
  const diffMs = now - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return isArabic ? '\u0627\u0644\u0622\u0646' : 'now'
  if (diffMin < 60) return isArabic ? `${diffMin}\u062F` : `${diffMin}m`
  if (diffHr < 24) return isArabic ? `${diffHr}\u0633` : `${diffHr}h`
  return isArabic ? `${diffDay}\u064A` : `${diffDay}d`
}

// ============================================================================
// Component
// ============================================================================

export function ConversationHistory() {
  const { t, i18n } = useTranslation('portal')
  const isArabic = i18n.language === 'ar'
  const isHistoryOpen = useChatStore((s) => s.isHistoryOpen)
  const setHistoryOpen = useChatStore((s) => s.setHistoryOpen)
  const activeRole = usePortalStore((s) => s.activeRole)
  const customerConversations = useChatStore((s) => s.customerConversations)
  const supplierConversations = useChatStore((s) => s.supplierConversations)
  const loadConversation = useChatStore((s) => s.loadConversation)
  const togglePin = useChatStore((s) => s.togglePin)

  const [search, setSearch] = useState('')

  const conversations =
    activeRole === 'customer' ? customerConversations : supplierConversations

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter(
      (c) =>
        c.preview.toLowerCase().includes(q) ||
        (c.entityRef && c.entityRef.toLowerCase().includes(q)),
    )
  }, [conversations, search])

  const groups = useMemo(
    () => groupConversations(filtered, new Date()),
    [filtered],
  )

  const handleThreadClick = useCallback(
    (id: string) => {
      loadConversation(activeRole, id)
      setHistoryOpen(false)
      setSearch('')
    },
    [activeRole, loadConversation, setHistoryOpen],
  )

  const handleClose = useCallback(() => {
    setHistoryOpen(false)
    setSearch('')
  }, [setHistoryOpen])

  return (
    <AnimatePresence>
      {isHistoryOpen && (
        <ModalOverlay
          isOpen={isHistoryOpen}
          onOpenChange={(open) => {
            if (!open) handleClose()
          }}
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
        >
          <Modal className="outline-none">
            <Dialog
              aria-label={t('chat.history')}
              isKeyboardDismissDisabled
              className="outline-none"
            >
              {({ close }) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                  }}
                  className="w-[480px] max-w-[100vw] max-h-[80vh] flex flex-col backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[rgba(0,0,0,0.90)] rounded-2xl shadow-2xl border border-[var(--color-border)]/50 sm:w-screen sm:max-w-none sm:h-screen sm:max-h-none sm:rounded-none"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 pt-4 pb-3 shrink-0">
                    <h2 className="text-base font-semibold text-[var(--color-text)]">
                      {t('chat.history')}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        handleClose()
                        close()
                      }}
                      className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-[var(--color-primary)]/5 transition-colors"
                      aria-label={t('window.close')}
                    >
                      <X size={20} className="text-[var(--color-text-muted)]" />
                    </button>
                  </div>

                  {/* Search input */}
                  <div className="px-6 pb-3 shrink-0">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('chat.historySearch')}
                      className="w-full h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                  </div>

                  {/* Conversation list */}
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {groups.size === 0 ? (
                      <div className="flex items-center justify-center h-32">
                        <p className="text-sm text-[var(--color-text-muted)]">
                          {t('chat.historyEmpty')}
                        </p>
                      </div>
                    ) : (
                      Array.from(groups.entries()).map(
                        ([group, convs]) => (
                          <div key={group}>
                            {/* Group header */}
                            <div className="ps-4 py-2">
                              <span className="text-[13px] font-semibold text-[var(--color-text-muted)] uppercase">
                                {getGroupLabel(group, t)}
                              </span>
                            </div>

                            {/* Thread entries */}
                            {convs.map((conv) => (
                              <button
                                type="button"
                                key={conv.id}
                                onClick={() => handleThreadClick(conv.id)}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  togglePin(activeRole, conv.id)
                                }}
                                className="w-full flex items-center h-16 px-4 text-start hover:bg-[var(--color-primary)]/3 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate text-[var(--color-text)]">
                                    {conv.preview}
                                  </p>
                                  {conv.entityRef && (
                                    <span className="font-[family-name:var(--font-geist-mono)] text-[13px] text-[var(--color-text-muted)]">
                                      {conv.entityRef}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ms-3">
                                  {conv.pinned && (
                                    <Pin
                                      size={12}
                                      className="text-[var(--color-primary)]"
                                    />
                                  )}
                                  <span className="text-[13px] text-[var(--color-text-muted)]">
                                    {getRelativeTime(conv.createdAt, isArabic)}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ),
                      )
                    )}
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
