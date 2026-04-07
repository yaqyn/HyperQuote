import { lazy, Suspense, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassWindow } from '@hyperquote/ui/glass/GlassWindow'
import { keyboardScopeStore } from '../../stores/keyboard-scope'
import { useInternalStore } from '../../stores/internal'
import { MODULES } from '../../lib/modules'
import { WindowHeader } from './WindowHeader'

const MODULE_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  sales: lazy(() => import('../sales/SalesModule').then((m) => ({ default: m.SalesModule }))),
  procurement: lazy(() => import('../procurement/ProcurementModule').then((m) => ({ default: m.ProcurementModule }))),
  orders: lazy(() => import('../operations/OperationsModule').then((m) => ({ default: m.OperationsModule }))),
  warehouse: lazy(() => import('../warehouse/WarehouseModule').then((m) => ({ default: m.WarehouseModule }))),
  finance: lazy(() => import('../finance/FinanceModule').then((m) => ({ default: m.FinanceModule }))),
  dispatch: lazy(() => import('../dispatch/DispatchModule').then((m) => ({ default: m.DispatchModule }))),
  'customer-service': lazy(() => import('../customer-service/CustomerServiceModule').then((m) => ({ default: m.CustomerServiceModule }))),
  hr: lazy(() => import('../hr/HRModule').then((m) => ({ default: m.HRModule }))),
  admin: lazy(() => import('../admin/AdminModule').then((m) => ({ default: m.AdminModule }))),
  reports: lazy(() => import('../reports/ReportsModule').then((m) => ({ default: m.ReportsModule }))),
}

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
  const ModuleComponent = MODULE_COMPONENTS[moduleId]

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
    if (contentRef.current) {
      saveWindowState(moduleId, { scrollTop: contentRef.current.scrollTop })
    }
    onClose()
  }

  return (
    <GlassWindow isOpen={isOpen} onClose={handleClose}>
      {/* Header — pinned at top, never scrolls */}
      <WindowHeader moduleId={moduleId} onClose={handleClose} />

      {/* Scrollable content area — takes remaining height */}
      <div
        ref={contentRef}
        data-module-content
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
      >
        {ModuleComponent ? (
          <Suspense fallback={<ModuleLoader />}>
            <ModuleComponent />
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
    </GlassWindow>
  )
}

function ModuleLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
    </div>
  )
}
