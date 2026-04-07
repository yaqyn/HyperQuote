import { useEffect } from 'react'
import { useReportsStore } from '../../stores/reports'
import type { ReportsTab } from '../../types/reports'

const TAB_SHORTCUTS: Record<string, ReportsTab> = {
  '1': 'sales',
  '2': 'procurement',
  '3': 'operations',
  '4': 'finance',
  '5': 'warehouse',
  '6': 'dispatch',
  '7': 'cs',
}

/**
 * Keyboard shortcuts for the Reports module.
 * Number keys 1-7 switch tabs directly.
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
