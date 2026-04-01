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
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      {/* Backdrop -- clicking closes window */}
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40"
        onClick={handleClose}
        role="presentation"
      />

      {/* Glass window panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 20,
        }}
        className={[
          'relative z-10 flex flex-col',
          'w-[95vw] md:w-[90vw] max-w-[1200px]',
          'max-h-[90vh]',
          'backdrop-blur-xl',
          'bg-[rgba(255,255,255,0.80)] dark:bg-[rgba(0,0,0,0.80)]',
          'rounded-3xl shadow-2xl',
          'border border-[var(--color-border)]/50',
          // Mobile: full-screen, no rounded corners, slide from bottom
          'max-md:w-full max-md:h-full max-md:max-h-full max-md:rounded-none',
        ].join(' ')}
      >
        {/* Header bar: h-56px, px-24px */}
        <div className="flex items-center justify-between h-14 px-6 border-b border-[var(--color-border)] shrink-0">
          <div className="flex flex-col">
            <h2 className="font-semibold text-lg text-[var(--color-text)]">
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
            className="flex items-center justify-center w-11 h-11 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <X size={24} />
          </Button>
        </div>

        {/* Content area */}
        <div className="overflow-auto flex-1">{children}</div>
      </motion.div>
    </div>
  )
}
