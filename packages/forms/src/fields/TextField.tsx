import {
	TextField as AriaTextField,
	FieldError,
	Input,
	Label,
	Text,
} from 'react-aria-components'
import { Controller, useFormContext } from 'react-hook-form'

interface TextFieldProps {
	name: string
	label: string
	type?: 'text' | 'email' | 'tel' | 'password'
	isRequired?: boolean
	description?: string
	placeholder?: string
	className?: string
}

export function TextField({
	name,
	label,
	type = 'text',
	isRequired,
	description,
	placeholder,
	className,
}: TextFieldProps) {
	const { control } = useFormContext()

	return (
		<Controller
			name={name}
			control={control}
			render={({ field, fieldState }) => (
				<AriaTextField
					value={field.value ?? ''}
					onChange={field.onChange}
					onBlur={field.onBlur}
					type={type}
					isRequired={isRequired}
					isInvalid={!!fieldState.error}
					className={className}
				>
					<Label>{label}</Label>
					<Input placeholder={placeholder} />
					{description && <Text slot="description">{description}</Text>}
					{fieldState.error && (
						<FieldError className="text-[var(--color-error)] text-[12px]">
							{fieldState.error.message}
						</FieldError>
					)}
				</AriaTextField>
			)}
		/>
	)
}
