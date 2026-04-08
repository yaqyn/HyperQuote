import { Button as AriaButton } from 'react-aria-components'
import type { ButtonProps as AriaButtonProps } from 'react-aria-components'

interface ButtonProps extends Omit<AriaButtonProps, 'className'> {
  variant?: 'primary' | 'outline' | 'subtle' | 'ghost'
  className?: string
}

export function Button({ variant = 'subtle', className = '', children, ...props }: ButtonProps) {
  const base = 'font-medium outline-none transition-all data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50 data-[disabled]:opacity-40'

  const variants = {
    primary: `${base} rounded-lg px-4 py-2 text-[13px] bg-[var(--color-primary)] text-white data-[hovered]:bg-[var(--color-primary)]/90`,
    outline: `${base} rounded-full px-4 py-1.5 text-[12px] border border-black/[0.06] text-[var(--color-text)] data-[hovered]:bg-black/[0.02] dark:border-white/[0.06] dark:data-[hovered]:bg-white/[0.03]`,
    subtle: `${base} rounded-full px-4 py-1.5 text-[12px] bg-black/[0.05] text-[var(--color-text)] data-[hovered]:bg-black/[0.08] dark:bg-white/[0.06] dark:data-[hovered]:bg-white/[0.1]`,
    ghost: `${base} rounded-full px-3 py-1 text-[12px] text-black/40 data-[hovered]:text-black/60 dark:text-white/40 dark:data-[hovered]:text-white/60`,
  }

  return (
    <AriaButton
      {...props}
      className={`${variants[variant]} ${className}`}
    >
      {children}
    </AriaButton>
  )
}
