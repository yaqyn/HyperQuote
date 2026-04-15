import type { ReactNode } from 'react'
import type { UseFormReturn, FieldValues } from 'react-hook-form'

// ─── Tab / step config ──────────────────────────────────
//
// Each panel declares its own tabs. The shell renders the
// strip and owns active-state transitions.

export interface TabConfig {
  id: string
  label: string
  icon?: ReactNode
  content: ReactNode
  disabled?: boolean
  completed?: boolean
}

// ─── Column config ──────────────────────────────────────
//
// Columns are data-driven so each panel adds/removes cells
// without forking the table component.
//
// `cell` receives the row item plus an index for RHF paths,
// and the shell's form context so editable cells can call
// setValue directly.

export interface ColumnConfig<TItem = unknown, TForm extends FieldValues = FieldValues> {
  id: string
  header: ReactNode
  width?: string | number
  align?: 'start' | 'end' | 'center'
  editable?: boolean
  cell: (ctx: {
    item: TItem
    index: number
    form: UseFormReturn<TForm>
  }) => ReactNode
}

// ─── Shell props ────────────────────────────────────────

export interface QuoteBuilderShellProps<TForm extends FieldValues = FieldValues> {
  form: UseFormReturn<TForm>
  title: ReactNode
  headerActions?: ReactNode
  tabs: TabConfig[]
  activeTabId: string
  onTabChange: (id: string) => void
  canvas?: ReactNode
  footer?: ReactNode
  onBack?: () => void
  backLabel?: string
}
