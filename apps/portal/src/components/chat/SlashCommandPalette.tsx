/**
 * SlashCommandPalette -- Elevated glass autocomplete overlay for /commands.
 *
 * React Aria ListBox for keyboard navigation and accessibility.
 * Positioned above chat input. Tween entrance per UI-SPEC animation contract.
 * 4 commands: /quote, /track, /price, /help with Lucide icons.
 */
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ListBox, ListBoxItem } from 'react-aria-components'
import { FileText, MapPin, DollarSign, HelpCircle } from 'lucide-react'
import type { SlashCommand } from '../../lib/chat-types'

// ============================================================================
// Icon map
// ============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FileText,
  MapPin,
  DollarSign,
  HelpCircle,
}

// ============================================================================
// Component
// ============================================================================

interface SlashCommandPaletteProps {
  commands: SlashCommand[]
  selectedIndex: number
  onSelect: (cmd: SlashCommand) => void
  onClose: () => void
  onHover: (index: number) => void
}

export function SlashCommandPalette({
  commands,
  selectedIndex,
  onSelect,
  onClose,
  onHover,
}: SlashCommandPaletteProps) {
  const { t } = useTranslation('portal')

  if (commands.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute bottom-full mb-2 start-0 end-0 max-w-[640px] mx-auto backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[rgba(0,0,0,0.90)] rounded-xl shadow-lg p-1 border border-[var(--color-border)]/50 z-50"
    >
      <ListBox
        aria-label="Slash commands"
        selectionMode="single"
        onAction={(key) => {
          const cmd = commands.find((c) => c.command === key)
          if (cmd) onSelect(cmd)
        }}
        className="outline-none"
      >
        {commands.map((cmd, idx) => {
          const Icon = ICON_MAP[cmd.icon]
          const isActive = idx === selectedIndex

          return (
            <ListBoxItem
              key={cmd.command}
              id={cmd.command}
              textValue={cmd.command}
              onHoverStart={() => onHover(idx)}
              className={`flex items-center gap-3 h-10 px-3 rounded-lg cursor-pointer outline-none transition-colors ${
                isActive
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-primary)]/5'
              }`}
            >
              {Icon && (
                <Icon
                  size={20}
                  className={
                    isActive
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)]'
                  }
                />
              )}
              <span className="text-sm font-semibold">{cmd.command}</span>
              <span
                className={`text-sm ${
                  isActive
                    ? 'text-[var(--color-primary)]/70'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                {t(cmd.descKey)}
              </span>
            </ListBoxItem>
          )
        })}
      </ListBox>
    </motion.div>
  )
}
