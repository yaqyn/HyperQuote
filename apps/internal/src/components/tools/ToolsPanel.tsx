import { useState } from 'react'
import { Button } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { X, MessageSquare, Calculator, Clock } from 'lucide-react'
import { AIChatInterface } from '../ai/chat/AIChatInterface'
import { SmartCalculator } from './SmartCalculator'
import { PrayerAndWeather } from './PrayerAndWeather'

type ToolTab = 'chat' | 'calculator' | 'info'

const TOOLS: { id: ToolTab; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'AI Chat', icon: MessageSquare },
  { id: 'calculator', label: 'Calculator', icon: Calculator },
  { id: 'info', label: 'Prayer & Weather', icon: Clock },
]

interface ToolsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function ToolsPanel({ isOpen, onClose }: ToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<ToolTab>('chat')

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Click-outside overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-[380px] flex flex-col bg-[var(--color-surface)] border-r border-black/[0.06] dark:border-white/[0.06] shadow-2xl shadow-black/5"
          >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-0.5">
              {TOOLS.map((tool) => {
                const isActive = activeTab === tool.id
                const Icon = tool.icon
                return (
                  <Button
                    key={tool.id}
                    onPress={() => setActiveTab(tool.id)}
                    aria-label={tool.label}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer outline-none transition-all duration-150 ${
                      isActive
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.5} />
                  </Button>
                )
              })}
            </div>

            <Button
              onPress={onClose}
              aria-label="Close tools"
              className="flex items-center justify-center w-7 h-7 rounded-lg text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer outline-none transition-colors"
            >
              <X size={14} strokeWidth={1.5} />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'chat' && <AIChatInterface />}
            {activeTab === 'calculator' && <SmartCalculator />}
            {activeTab === 'info' && <PrayerAndWeather />}
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
