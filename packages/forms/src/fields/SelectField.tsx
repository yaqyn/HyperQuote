import { Button } from 'react-aria-components/Button'
import { FieldError } from 'react-aria-components/FieldError'
import { Label } from 'react-aria-components/Label'
import { ListBox, ListBoxItem } from 'react-aria-components/ListBox'
import { Popover } from 'react-aria-components/Popover'
import { Select, SelectValue } from 'react-aria-components/Select'
import { Controller, useFormContext } from 'react-hook-form'

interface SelectFieldProps {
	name: string
	label: string
	items: { id: string; label: string }[]
	isRequired?: boolean
	placeholder?: string
	className?: string
}

export function SelectField({
	name,
	label,
	items,
	isRequired,
	placeholder,
	className,
}: SelectFieldProps) {
	const { control } = useFormContext()

	return (
		<Controller
			name={name}
			control={control}
			render={({ field, fieldState }) => (
				<Select
					selectedKey={field.value ?? null}
					onSelectionChange={field.onChange}
					onBlur={field.onBlur}
					isRequired={isRequired}
					isInvalid={!!fieldState.error}
					className={className}
				>
					<Label>{label}</Label>
					<Button>
						<SelectValue>{placeholder}</SelectValue>
					</Button>
					<Popover>
						<ListBox items={items}>
							{(item) => <ListBoxItem id={item.id}>{item.label}</ListBoxItem>}
						</ListBox>
					</Popover>
					{fieldState.error && (
						<FieldError className="text-[var(--color-error)] text-[12px]">
							{fieldState.error.message}
						</FieldError>
					)}
				</Select>
			)}
		/>
	)
}
