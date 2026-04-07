import { AIShortcuts } from './AIShortcuts'
import { AIChatInterface } from './chat/AIChatInterface'

/**
 * AI — "The Terminal"
 * Minimal CLI-inspired chat. Zero chrome. The conversation is everything.
 * Single-view — no tabs, just the chat interface.
 * Safety indicators rendered as subtle mono text, not badges.
 */
export function AIModule() {
  return (
    <div className="flex flex-col h-full">
      <AIShortcuts />

      {/* Safety indicators — barely visible, always present */}
      <div className="flex items-center gap-4 px-5 py-1.5 border-b border-black/[0.03] dark:border-white/[0.03]">
        <SafetyIndicator label="Read-only DB" />
        <SafetyIndicator label="Draft-Review-Confirm" />
        <SafetyIndicator label="Audit Logged" />
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <AIChatInterface />
      </div>
    </div>
  )
}

function SafetyIndicator({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-[family-name:var(--font-geist-mono)] text-black/20 dark:text-white/20">
      {label}
    </span>
  )
}
