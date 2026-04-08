import { useEffect } from 'react'
import { useReportsStore } from '../../stores/reports'
import type { ReportsTab } from '../../types/reports'

const TAB_SHORTCUTS: Record<string, ReportsTab> = {
  '1': 'overview',
  '2': 'sales',
  '3': 'procurement',
  '4': 'operations',
  '5': 'finance',
  '6': 'warehouse',
  '7': 'dispatch',
  '8': 'cs',
}

/**
 * Keyboard shortcuts for the Reports module.
 * Number keys 1-8 switch tabs directly.
 */
export function ReportsShortcuts() {
  const setActiveTab = useReportsStore((s) => s.setActiveTab)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const tab = TAB_SHORTCUTS[e.key]
      if (tab) {
        e.preventDefault()
        setActiveTab(tab)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setActiveTab])

  return null
}
