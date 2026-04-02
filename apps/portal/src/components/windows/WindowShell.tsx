import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from 'react-aria-components'
import { useShortcut } from '../../hooks/useShortcut'

interface WindowShellProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export function WindowShell({ title, subtitle, children }: WindowShellProps) {
  const navigate = useNavigate()
  const { t } = useTranslation('portal')

  const handleClose = () => {
    navigate({ to: '/' })
  }

  // Escape closes window
  useShortcut('Escape', handleClose)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{
        default: { type: 'spring', stiffness: 200, damping: 20 },
        exit: { duration: 0.2, ease: 'easeIn' },
      }}
      className="fixed inset-0 z-40 flex flex-col bg-[var(--color-base)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 ps-6 pe-4 border-b border-[var(--color-text)]/8 shrink-0">
        <div className="flex flex-col">
          <h2 className="font-normal text-base text-[var(--color-text)]">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
        <Button
          onPress={handleClose}
          aria-label={t('window.close')}
          className="flex items-center justify-center w-10 h-10 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
        >
          <X size={20} />
        </Button>
      </div>

      {/* Content area */}
      <div className="overflow-auto flex-1">{children}</div>
    </motion.div>
  )
}
