import { Switch } from 'react-aria-components'
import type { SwitchProps } from 'react-aria-components'

interface ToggleProps extends Omit<SwitchProps, 'className' | 'children'> {
  label?: string
  className?: string
}

export function Toggle({ label, className = '', ...props }: ToggleProps) {
  return (
    <Switch
      {...props}
      className={`group flex items-center gap-1.5 ${className}`}
    >
      <div className="h-4 w-7 rounded-full bg-black/[0.06] p-0.5 transition-colors group-data-[selected]:bg-[var(--color-primary)] dark:bg-white/[0.08]">
        <div className="h-3 w-3 rounded-full bg-white shadow transition-transform group-data-[selected]:translate-x-3 dark:bg-black" />
      </div>
      {label && (
        <span className="text-[12px] text-[var(--color-text-muted)]">{label}</span>
      )}
    </Switch>
  )
}
