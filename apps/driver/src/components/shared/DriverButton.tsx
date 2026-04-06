import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export type DriverButtonVariant = 'primary' | 'secondary' | 'danger'

interface DriverButtonProps extends Omit<AriaButtonProps, 'className' | 'style'> {
  variant?: DriverButtonVariant
  isLoading?: boolean
  className?: string
}

const variantStyles: Record<DriverButtonVariant, string> = {
  primary:
    'bg-[var(--color-blue)] text-white pressed:opacity-90',
  secondary:
    'bg-white text-[var(--color-blue)] border-2 border-[var(--color-blue)] pressed:opacity-90',
  danger:
    'bg-[var(--color-danger)] text-white pressed:opacity-90',
}

export function DriverButton({
  variant = 'primary',
  isLoading = false,
  children,
  className = '',
  isDisabled,
  onPress,
  ...props
}: DriverButtonProps) {
  return (
    <AriaButton
      {...props}
      isDisabled={isDisabled || isLoading}
      onPress={async (e) => {
        try {
          await Haptics.impact({ style: ImpactStyle.Light })
        } catch {
          // Haptics may not be available in web
        }
        onPress?.(e)
      }}
      className={`
        flex w-full items-center justify-center
        rounded-xl font-medium
        min-h-[var(--touch-min)] text-base
        transition-opacity duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)] focus-visible:ring-offset-2
        ${variantStyles[variant]}
        ${className}
      `.trim()}
    >
      {isLoading ? (
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      ) : (
        children
      )}
    </AriaButton>
  )
}
