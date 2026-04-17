import type { ReactNode } from 'react'
import {
	type FieldValues,
	FormProvider,
	type UseFormReturn,
} from 'react-hook-form'

interface FormRootProps<TFieldValues extends FieldValues> {
	form: UseFormReturn<TFieldValues>
	onSubmit: (data: TFieldValues) => void
	children: ReactNode
	className?: string
}

export function FormRoot<TFieldValues extends FieldValues>({
	form,
	onSubmit,
	children,
	className,
}: FormRootProps<TFieldValues>) {
	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className={className}>
				{children}
			</form>
		</FormProvider>
	)
}
