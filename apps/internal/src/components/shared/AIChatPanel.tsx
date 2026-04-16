import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Trash2, ArrowDown } from 'lucide-react'
import { useAIChatStore, type AIChatMessage } from '../../stores/ai-chat'
import { SlidePanel } from './SlidePanel'

/**
 * AIChatPanel — global shell-level assistant. Persists across module
 * switches (same store instance, same conversation).
 *
 * Style: typographic thread, not bubbles. Each message is an eyebrow
 * label + a prose body with a thin primary-blue accent rule on the
 * edge the speaker "comes from". No backgrounds, no pill shapes —
 * spacing and a single hairline carry the conversation feel.
 */
export function AIChatPanel() {
  const isOpen = useAIChatStore((s) => s.isOpen)
  const close = useAIChatStore((s) => s.close)
  const messages = useAIChatStore((s) => s.messages)
  const draft = useAIChatStore((s) => s.draft)
  const setDraft = useAIChatStore((s) => s.setDraft)
  const send = useAIChatStore((s) => s.send)
  const clear = useAIChatStore((s) => s.clear)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  // Auto-stick to the bottom as new messages arrive — but only if the
  // user is already near the bottom. If they've scrolled up to read, we
  // leave their scroll position alone and show the jump-to-bottom button.
  useEffect(() => {
    if (!isOpen) return
    const node = scrollRef.current
    if (!node) return
    const nearBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight < 120
    if (nearBottom) node.scrollTop = node.scrollHeight
  }, [messages, isOpen])

  // Track scroll position so we know when to reveal the jump-to-bottom.
  useEffect(() => {
    if (!isOpen) return
    const node = scrollRef.current
    if (!node) return
    const handler = () => {
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight
      setShowScrollToBottom(distance > 120)
    }
    handler()
    node.addEventListener('scroll', handler, { passive: true })
    return () => node.removeEventListener('scroll', handler)
  }, [isOpen, messages])

  const jumpToBottom = () => {
    const node = scrollRef.current
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }

  // Auto-size the composer textarea up to MAX_LINES, then let it scroll
  // internally. Runs in a layout effect so the height change happens
  // before paint — no flicker.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const MAX_LINES = 6
    // Read line-height from the computed style so this stays in sync
    // with whatever text-xx / leading-xx classes the textarea carries.
    const cs = window.getComputedStyle(el)
    const lineHeight = parseFloat(cs.lineHeight || '20') || 20
    const maxHeight = lineHeight * MAX_LINES
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [draft, isOpen])

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={close}
      side="start"
      maxWidth={420}
      panelKey="ai-chat-panel"
      ariaLabel="AI assistant"
    >
      {/* Clear action — shown only when there's a conversation to clear */}
      {messages.length > 0 && (
        <div className="flex justify-end px-6 pt-5 pb-2">
          <button
            type="button"
            onClick={clear}
            aria-label="Clear conversation"
            className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-subtle)] transition-colors hover:text-[var(--color-text)]"
          >
            <Trash2 size={10} strokeWidth={2} />
            Clear
          </button>
        </div>
      )}

      {/* Thread */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto px-6 pb-4"
        >
          {messages.length === 0 ? <EmptyState /> : (
            <div className="flex flex-col gap-7">
              {messages.map((m) => (
                <MessageEntry key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>

        {/* Jump-to-bottom affordance — quiet fade in / fade out, glass pill */}
        <AnimatePresence>
          {showScrollToBottom && (
            <motion.button
              key="jump-to-bottom"
              type="button"
              onClick={jumpToBottom}
              aria-label="Jump to latest"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/55 text-[var(--color-primary)] backdrop-blur-[2px] backdrop-saturate-150 transition-colors hover:bg-white/70 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <ArrowDown size={13} strokeWidth={2.5} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Composer — glued to the bottom, borderless, integrated with the
          conversation rhythm so it feels like continuing the letter. */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="border-t border-black/[0.05] px-6 py-4 dark:border-white/[0.06]"
      >
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Ask the assistant…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-[12.5px] leading-relaxed text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send"
            className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)] transition-colors disabled:cursor-not-allowed disabled:text-[var(--color-text-subtle)]"
          >
            ⏎ send
          </button>
        </div>
      </form>
    </SlidePanel>
  )
}

// ─── Empty state ─────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex h-full items-center">
      <div className="ps-4 border-s-2 border-[var(--color-primary)]/60">
        <p className="text-[13px] leading-relaxed text-[var(--color-text)]">
          Ask Lyon about anything on screen.
        </p>
        <p className="mt-1.5 max-w-[260px] text-[11px] leading-relaxed text-[var(--color-text-subtle)]">
          Margins, stock, suppliers, order readiness — Lyon sees the same
          data you do and can help you decide faster.
        </p>
      </div>
    </div>
  )
}

// ─── Message entry ───────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' })
}

function MessageEntry({ message }: { message: AIChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[92%] ${isUser ? 'text-end' : 'text-start'}`}>
        {/* Eyebrow: role · time */}
        <div className={`flex items-center gap-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
            {isUser ? 'You' : 'Lyon'}
          </span>
          <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
            · {formatTime(message.createdAt)}
          </span>
        </div>

        {/* Body — thin accent bar on the speaking edge, prose text,
            no background. */}
        <div
          className={`mt-1.5 ${
            isUser
              ? 'border-e-2 border-[var(--color-primary)]/50 pe-3'
              : 'border-s-2 border-[var(--color-primary)]/50 ps-3'
          }`}
        >
          <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--color-text)]">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  )
}
