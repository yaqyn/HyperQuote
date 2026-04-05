import { useMemo, useState, useCallback, useEffect } from 'react'
import Fuse from 'fuse.js'
import { useTranslation } from 'react-i18next'
import { Dialog, Input, Menu, MenuItem, Section, Header, Autocomplete } from 'react-aria-components'
import { hasPermission, type AuthSession } from '@hyperquote/auth'
import { GlassElevated } from '@hyperquote/ui/glass/GlassElevated'
import { MODULES } from '../../lib/modules'
import { useInternalStore } from '../../stores/internal'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { CommandResult } from './CommandResult'

interface InternalCommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  auth: AuthSession
}

interface SearchItem {
  id: string
  category: 'modules' | 'actions' | 'entities' | 'recent'
  label: string
  hotkey?: string
  permission?: string
  icon?: string
}

const ACTIONS: Omit<SearchItem, 'category'>[] = [
  { id: 'create-quote', label: 'actions.createQuote', permission: 'sales.write' },
  { id: 'add-customer', label: 'actions.addCustomer', permission: 'sales.write' },
  { id: 'create-po', label: 'actions.createPO', permission: 'procurement.write' },
  { id: 'assign-driver', label: 'actions.assignDriver', permission: 'dispatch.write' },
]

/**
 * Internal platform command palette.
 * Uses GlassElevated + React Aria Autocomplete/Dialog/Menu for proper
 * keyboard navigation and accessibility. Fuse.js for fuzzy search.
 */
export function InternalCommandPalette({ isOpen, onClose, auth }: InternalCommandPaletteProps) {
  const { t } = useTranslation('internal')
  const [inputValue, setInputValue] = useState('')
  const setActiveModule = useInternalStore((s) => s.setActiveModule)
  const { openPanel, closePanel } = useKeyboardScope()

  // Build permission-filtered searchable items
  const items = useMemo(() => {
    const result: SearchItem[] = []

    // Module navigation
    for (const mod of MODULES) {
      if (hasPermission(auth, mod.permission)) {
        result.push({
          id: mod.id,
          category: 'modules',
          label: t(mod.labelKey),
          hotkey: mod.hotkey,
        })
      }
    }

    // Actions
    for (const action of ACTIONS) {
      if (!action.permission || hasPermission(auth, action.permission)) {
        result.push({
          id: action.id,
          category: 'actions',
          label: t(action.label),
        })
      }
    }

    // Recent items: empty for now (will be populated from user history)

    return result
  }, [auth, t])

  // Fuse instance
  const fuse = useMemo(
    () => new Fuse(items, { keys: ['label', 'hotkey'], threshold: 0.3, includeScore: true }),
    [items],
  )

  // Filter results
  const results = useMemo(() => {
    if (!inputValue.trim()) return items
    return fuse.search(inputValue).map((r) => r.item)
  }, [inputValue, fuse, items])

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {}
    for (const item of results) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    return groups
  }, [results])

  const categoryLabels: Record<string, string> = {
    modules: t('commandPalette.modules', 'Modules'),
    actions: t('commandPalette.actions', 'Actions'),
    entities: t('commandPalette.entities', 'Entities'),
    recent: t('commandPalette.recent', 'Recent'),
  }

  // Handle open/close scope transitions
  useEffect(() => {
    if (isOpen) {
      openPanel()
    }
  }, [isOpen, openPanel])

  const handleClose = useCallback(() => {
    closePanel()
    setInputValue('')
    onClose()
  }, [closePanel, onClose])

  const handleSelect = useCallback(
    (key: React.Key) => {
      const id = String(key)
      // Check if it's a module
      const mod = MODULES.find((m) => m.id === id)
      if (mod) {
        setActiveModule(id)
        handleClose()
        return
      }
      // Action -- placeholder navigation
      console.log('Action selected:', id)
      handleClose()
    },
    [setActiveModule, handleClose],
  )

  // Get module icon component for a given module id
  const getModuleIcon = useCallback((id: string) => {
    const mod = MODULES.find((m) => m.id === id)
    if (!mod) return null
    const Icon = mod.icon
    return <Icon size={20} />
  }, [])

  return (
    <GlassElevated isOpen={isOpen} onClose={handleClose} className="max-w-[600px] w-full">
      <Dialog aria-label={t('commandPalette.label', 'Command palette')} isKeyboardDismissDisabled className="outline-none">
        <Autocomplete inputValue={inputValue} onInputChange={setInputValue}>
          {/* Search input area */}
          <div className="border-b border-[var(--color-border)]">
            <Input
              autoFocus
              placeholder={t('commandPalette.placeholder', 'Search modules, actions...')}
              className="w-full bg-transparent text-[var(--color-text)] text-base outline-none placeholder:text-[var(--color-text-subtle)] px-4 py-3"
            />
          </div>

          {/* Results area */}
          <Menu
            aria-label={t('commandPalette.results', 'Results')}
            onAction={handleSelect}
            className="px-2 py-2 max-h-[400px] overflow-auto outline-none"
          >
            {Object.entries(grouped).map(([category, categoryItems]) => (
              <Section key={category}>
                <Header className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide px-3 py-1.5">
                  {categoryLabels[category] ?? category}
                </Header>
                {categoryItems.map((item) => (
                  <MenuItem
                    key={item.id}
                    id={item.id}
                    textValue={item.label}
                    className="rounded-md cursor-pointer data-[focused]:bg-[var(--color-primary)]/5 outline-none"
                  >
                    <CommandResult
                      id={item.id}
                      type={category}
                      label={item.label}
                      hotkey={item.hotkey}
                      icon={category === 'modules' ? getModuleIcon(item.id) : null}
                    />
                  </MenuItem>
                ))}
              </Section>
            ))}
          </Menu>
        </Autocomplete>
      </Dialog>
    </GlassElevated>
  )
}
