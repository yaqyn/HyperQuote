import { Controller, useFormContext } from 'react-hook-form'
import { Checkbox } from 'react-aria-components'

interface CheckboxFieldProps {
  name: string
  label: string
  className?: string
}

export function CheckboxField({ name, label, className }: CheckboxFieldProps) {
  const { control } = useFormContext()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Checkbox
          isSelected={field.value ?? false}
          onChange={field.onChange}
          onBlur={field.onBlur}
          className={className}
        >
          {label}
        </Checkbox>
      )}
    />
  )
}
