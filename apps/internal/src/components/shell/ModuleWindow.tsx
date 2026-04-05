import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassWindow } from '@hyperquote/ui/glass/GlassWindow'
import { keyboardScopeStore } from '../../stores/keyboard-scope'
import { useInternalStore } from '../../stores/internal'
import { MODULES } from '../../lib/modules'
import { WindowHeader } from './WindowHeader'

interface ModuleWindowProps {
  moduleId: string
  isOpen: boolean
  onClose: () => void
}

export function ModuleWindow({ moduleId, isOpen, onClose }: ModuleWindowProps) {
  const { t } = useTranslation('internal')
  const contentRef = useRef<HTMLDivElement>(null)
  const getWindowState = useInternalStore((s) => s.getWindowState)
  const saveWindowState = useInternalStore((s) => s.saveWindowState)

  const mod = MODULES.find((m) => m.id === moduleId)

  // Manage keyboard scope
  useEffect(() => {
    if (isOpen) {
      keyboardScopeStore.send({ type: 'openPanel' })
    }
    return () => {
      if (isOpen) {
        keyboardScopeStore.send({ type: 'closePanel' })
      }
    }
  }, [isOpen])

  // Restore scroll position on mount
  useEffect(() => {
    if (isOpen && contentRef.current) {
      const saved = getWindowState(moduleId)
      if (saved?.scrollTop) {
        contentRef.current.scrollTop = saved.scrollTop
      }
    }
  }, [isOpen, moduleId, getWindowState])

  function handleClose() {
    // Save scroll position before closing
    if (contentRef.current) {
      saveWindowState(moduleId, { scrollTop: contentRef.current.scrollTop })
    }
    onClose()
  }

  return (
    <GlassWindow isOpen={isOpen} onClose={handleClose}>
      <div className="flex flex-col h-full">
        <WindowHeader moduleId={moduleId} onClose={handleClose} />
        <div ref={contentRef} data-module-content className="flex-1 overflow-auto p-6">
          {/* Placeholder until Phases 16-22 build actual module content */}
          <div className="flex flex-col items-center justify-center h-full gap-3">
            {mod && <mod.icon size={48} className="text-[var(--color-text-muted)]" />}
            <p className="text-[var(--color-text-muted)] text-sm">
              {t('window.comingSoon')}
            </p>
          </div>
        </div>
      </div>
    </GlassWindow>
  )
}
