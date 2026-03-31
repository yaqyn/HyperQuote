import type { ReactNode } from 'react'
import { FormProvider, type UseFormReturn } from 'react-hook-form'

interface FormRootProps {
  form: UseFormReturn<any>
  onSubmit: (data: any) => void
  children: ReactNode
  className?: string
}

export function FormRoot({ form, onSubmit, children, className }: FormRootProps) {
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
        {children}
      </form>
    </FormProvider>
  )
}
