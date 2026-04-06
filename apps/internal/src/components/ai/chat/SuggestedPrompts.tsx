import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getAISuggestions } from '../../../lib/server/ai-assistant'
import type { RoleSuggestion } from '../../../types/ai'

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

/**
 * Role-aware prompt suggestions displayed when chat is empty.
 * Clickable chips that populate input and auto-send.
 */
export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  const { t } = useTranslation('ai')

  return (
    <div className="max-w-xl mx-auto text-center space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">
          {t('prompts.title', 'Suggested questions')}
        </h2>
        <p className="text-sm text-black/40 dark:text-white/40">
          {t('prompts.subtitle', 'Click any question to get started')}
        </p>
      </div>

      <div className="space-y-4">
        {ALL_ROLE_SUGGESTIONS.map((group) => (
          <div key={group.role}>
            <div className="text-xs font-medium text-black/40 dark:text-white/40 mb-2">
              {group.role}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {group.prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSelect(prompt)}
                  className="inline-flex items-center rounded-full px-3.5 py-2 text-sm backdrop-blur-sm bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:border-[#2563EB]/30 hover:text-[#2563EB] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
