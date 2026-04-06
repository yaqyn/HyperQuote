import { NumberField, Label, Input, Group } from 'react-aria-components'
import type { NumberFieldProps } from 'react-aria-components'

interface LargeNumberInputProps extends Omit<NumberFieldProps, 'children'> {
  label: string
  unit?: string
}

/**
 * React Aria NumberField wrapped with Geist Mono font, 64dp height, large touch target.
 * Designed for warehouse scanner devices with glove use.
 */
export function LargeNumberInput({
  label,
  unit,
  ...props
}: LargeNumberInputProps) {
  return (
    <NumberField {...props}>
      <Label className="text-sm font-medium text-[var(--color-text-secondary)]">
        {label}
      </Label>
      <Group className="flex items-center gap-2">
        <Input className="h-16 min-h-[64px] w-full rounded-lg border border-[var(--color-border)] px-4 text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums text-center" />
        {unit && (
          <span className="text-sm font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
            {unit}
          </span>
        )}
      </Group>
    </NumberField>
  )
}
