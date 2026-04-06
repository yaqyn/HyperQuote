import { lazy, Suspense, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassWindow } from '@hyperquote/ui/glass/GlassWindow'
import { keyboardScopeStore } from '../../stores/keyboard-scope'
import { useInternalStore } from '../../stores/internal'
import { MODULES } from '../../lib/modules'
import { WindowHeader } from './WindowHeader'

const SalesModule = lazy(() =>
  import('../sales/SalesModule').then((m) => ({ default: m.SalesModule })),
)

const ProcurementModule = lazy(() =>
  import('../procurement/ProcurementModule').then((m) => ({ default: m.ProcurementModule })),
)

const OperationsModule = lazy(() =>
  import('../operations/OperationsModule').then((m) => ({ default: m.OperationsModule })),
)

const WarehouseModule = lazy(() =>
  import('../warehouse/WarehouseModule').then((m) => ({ default: m.WarehouseModule })),
)

const FinanceModule = lazy(() =>
  import('../finance/FinanceModule').then((m) => ({ default: m.FinanceModule })),
)

const DispatchModule = lazy(() =>
  import('../dispatch/DispatchModule').then((m) => ({ default: m.DispatchModule })),
)

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
        <div ref={contentRef} data-module-content className="flex-1 overflow-auto">
          {moduleId === 'sales' ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
                </div>
              }
            >
              <SalesModule />
            </Suspense>
          ) : moduleId === 'procurement' ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
                </div>
              }
            >
              <ProcurementModule />
            </Suspense>
          ) : moduleId === 'orders' ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
                </div>
              }
            >
              <OperationsModule />
            </Suspense>
          ) : moduleId === 'warehouse' ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
                </div>
              }
            >
              <WarehouseModule />
            </Suspense>
          ) : moduleId === 'finance' ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
                </div>
              }
            >
              <FinanceModule />
            </Suspense>
          ) : moduleId === 'dispatch' ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
                </div>
              }
            >
              <DispatchModule />
            </Suspense>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
              {mod && <mod.icon size={48} className="text-[var(--color-text-muted)]" />}
              <p className="text-[var(--color-text-muted)] text-sm">
                {t('window.comingSoon')}
              </p>
            </div>
          )}
        </div>
      </div>
    </GlassWindow>
  )
}
