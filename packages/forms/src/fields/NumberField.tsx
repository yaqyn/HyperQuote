import {
	NumberField as AriaNumberField,
	FieldError,
	Group,
	Input,
	Label,
} from 'react-aria-components'
import { Controller, useFormContext } from 'react-hook-form'

interface NumberFieldProps {
	name: string
	label: string
	minValue?: number
	maxValue?: number
	formatOptions?: Intl.NumberFormatOptions
	isRequired?: boolean
	className?: string
}

export function NumberField({
	name,
	label,
	minValue,
	maxValue,
	formatOptions,
	isRequired,
	className,
}: NumberFieldProps) {
	const { control } = useFormContext()

	return (
		<Controller
			name={name}
			control={control}
			render={({ field, fieldState }) => (
				<AriaNumberField
					value={field.value ?? undefined}
					onChange={field.onChange}
					onBlur={field.onBlur}
					minValue={minValue}
					maxValue={maxValue}
					formatOptions={formatOptions}
					isRequired={isRequired}
					isInvalid={!!fieldState.error}
					className={className}
				>
					<Label>{label}</Label>
					<Group>
						<Input className="font-mono" />
					</Group>
					{fieldState.error && (
						<FieldError className="text-[var(--color-error)] text-[12px]">
							{fieldState.error.message}
						</FieldError>
					)}
				</AriaNumberField>
			)}
		/>
	)
}
