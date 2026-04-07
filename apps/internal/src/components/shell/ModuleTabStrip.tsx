import { useRef } from 'react'
import { motion } from 'motion/react'
import { Button } from 'react-aria-components'

interface Tab {
  id: string
  label: string
  badge?: number
}

interface ModuleTabStripProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (id: string) => void
  ariaLabel?: string
}

/**
 * Shared centered tab strip with animated blue underline.
 * Used across all modules for consistent navigation.
 *
 * - Centered layout
 * - Blue accent line slides between tabs (motion layoutId)
 * - Subtle spring animation
 * - Badge count in Geist Mono
 */
export function ModuleTabStrip({ tabs, activeTab, onTabChange, ariaLabel = 'Module tabs' }: ModuleTabStripProps) {
  return (
    <nav aria-label={ariaLabel} className="flex justify-center">
      <div className="inline-flex items-center gap-1 relative">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <Button
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className="relative px-4 py-2 text-[13px] font-medium cursor-pointer outline-none transition-colors duration-150 rounded-lg data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
              style={{
                color: isActive
                  ? 'var(--color-text)'
                  : 'var(--color-text-subtle)',
              }}
            >
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums ${
                    isActive ? 'text-[var(--color-primary)]' : 'opacity-40'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </span>

              {/* Animated underline */}
              {isActive && (
                <motion.div
                  layoutId="module-tab-underline"
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-[var(--color-primary)] rounded-full"
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
            </Button>
          )
        })}
      </div>
    </nav>
  )
}
