import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getAISuggestions } from '../../../lib/server/ai-assistant'
import type { RoleSuggestion } from '../../../types/ai'

/**
 * SuggestedPrompts — "The Hints"
 * Before first message: 3-4 suggested prompts as subtle clickable text.
 * Not cards, not buttons. Just text with hover underline.
 * Disappear after first message sent.
 */

// All role suggestions — role filtering comes with real auth
const ALL_ROLE_SUGGESTIONS: RoleSuggestion[] = [
  {
    role: 'Sales',
    prompts: ['Show open quotes for customer X', 'Draft follow-up email', 'Inactive customers 30+ days?'],
  },
  {
    role: 'Procurement',
    prompts: ['Best rebar pricing this month?', 'Supplier A on-time rate?'],
  },
  {
    role: 'Operations',
    prompts: ['Orders at risk of missing delivery?', 'Deliveries scheduled tomorrow?'],
  },
  {
    role: 'Finance',
    prompts: ['AR aging over 90 days?', 'Customers with bounced cheques?'],
  },
  {
    role: 'Warehouse',
    prompts: ['Where is Portland Cement Type I?', 'Cycle count accuracy?'],
  },
  {
    role: 'Dispatch',
    prompts: ['Available drivers for tomorrow?', 'Optimize Cairo routes?'],
  },
  {
    role: 'Management',
    prompts: ['How are we doing this month?', 'What needs my approval?'],
  },
]

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void
}

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  const { t } = useTranslation('ai')

  // Pick a few representative prompts across roles
  const hints = ALL_ROLE_SUGGESTIONS.flatMap((g) =>
    g.prompts.slice(0, 1).map((p) => ({ role: g.role, prompt: p })),
  ).slice(0, 4)

  return (
    <div className="max-w-[480px] mx-auto text-center space-y-6 px-5">
      <div className="text-sm text-black/25 dark:text-white/25">
        {t('prompts.subtitle', 'Try asking...')}
      </div>

      <div className="space-y-3">
        {hints.map(({ prompt }) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect(prompt)}
            className="block w-full text-start text-sm text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:underline underline-offset-4 decoration-black/10 dark:decoration-white/10 transition-colors cursor-pointer py-0.5"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* All prompts by role — subtle expandable */}
      <details className="text-start">
        <summary className="text-[10px] text-black/20 dark:text-white/20 cursor-pointer hover:text-black/30 dark:hover:text-white/30">
          {t('prompts.more', 'More suggestions by role')}
        </summary>
        <div className="mt-3 space-y-3">
          {ALL_ROLE_SUGGESTIONS.map((group) => (
            <div key={group.role}>
              <div className="text-[10px] font-[family-name:var(--font-geist-mono)] uppercase tracking-wider text-black/20 dark:text-white/20 mb-1">
                {group.role}
              </div>
              {group.prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSelect(prompt)}
                  className="block text-xs text-black/35 dark:text-white/35 hover:text-black dark:hover:text-white hover:underline underline-offset-2 decoration-black/10 dark:decoration-white/10 transition-colors cursor-pointer py-0.5"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
