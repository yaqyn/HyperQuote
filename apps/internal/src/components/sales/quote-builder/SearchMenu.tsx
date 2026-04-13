import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Button } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { Search, X } from 'lucide-react'

interface SearchMenuProps {
  isOpen: boolean
  onClose: () => void
  placeholder?: string
  children: (search: string) => ReactNode
}

export function SearchMenu({ isOpen, onClose, placeholder = 'Search...', children }: SearchMenuProps) {
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setSearch('')
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg flex flex-col bg-[var(--color-surface)] rounded-2xl shadow-2xl shadow-black/10 border border-black/[0.06] dark:border-white/[0.06] max-h-[70vh] overflow-hidden"
          >
            {/* Search input */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.04]">
              <Search size={16} strokeWidth={1.5} className="text-[var(--color-text-subtle)] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-[14px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/50"
              />
              <Button
                onPress={onClose}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none"
              >
                <X size={14} strokeWidth={1.5} />
              </Button>
            </div>

            {/* Results — rendered by caller */}
            <div className="flex-1 min-h-0 overflow-y-auto" data-module-content>
              {children(search)}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
