import { NumberField, Label, Input, Group, Button } from 'react-aria-components'
import type { NumberFieldProps } from 'react-aria-components'

interface LargeNumberInputProps extends Omit<NumberFieldProps, 'children'> {
  label: string
  unit?: string
}

/**
 * Huge mono input (32px font) with prominent +/- buttons.
 * 80px height for gloved warehouse workers on tablets.
 * +/- buttons are 64px wide touch targets.
 */
export function LargeNumberInput({
  label,
  unit,
  ...props
}: LargeNumberInputProps) {
  return (
    <NumberField {...props}>
      <Label className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
        {label}
      </Label>
      <Group className="flex items-stretch gap-0 mt-1">
        <Button
          slot="decrement"
          className="flex h-20 w-16 items-center justify-center rounded-s-lg border border-e-0 border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-2xl font-semibold text-black/60 dark:text-white/60 cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.06] pressed:bg-black/[0.08] dark:pressed:bg-white/[0.08] transition-colors select-none"
        >
          -
        </Button>
        <Input className="h-20 flex-1 border border-black/10 dark:border-white/10 bg-transparent px-4 text-[32px] font-[family-name:var(--font-geist-mono)] tabular-nums text-center text-black/90 dark:text-white/90 outline-none focus:border-[#2563EB] transition-colors" />
        <Button
          slot="increment"
          className="flex h-20 w-16 items-center justify-center rounded-e-lg border border-s-0 border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-2xl font-semibold text-black/60 dark:text-white/60 cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.06] pressed:bg-black/[0.08] dark:pressed:bg-white/[0.08] transition-colors select-none"
        >
          +
        </Button>
        {unit && (
          <span className="flex items-center ps-3 text-sm font-medium text-black/40 dark:text-white/40 whitespace-nowrap">
            {unit}
          </span>
        )}
      </Group>
    </NumberField>
  )
}
