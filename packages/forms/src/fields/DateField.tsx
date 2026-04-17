import type { DateValue } from 'react-aria-components'
import {
	Button,
	Calendar,
	CalendarCell,
	CalendarGrid,
	DateInput,
	DatePicker,
	DateSegment,
	Dialog,
	FieldError,
	Group,
	Heading,
	Label,
	Popover,
} from 'react-aria-components'
import { Controller, useFormContext } from 'react-hook-form'

interface DateFieldProps {
	name: string
	label: string
	minValue?: DateValue
	maxValue?: DateValue
	isRequired?: boolean
	className?: string
}

export function DateField({
	name,
	label,
	minValue,
	maxValue,
	isRequired,
	className,
}: DateFieldProps) {
	const { control } = useFormContext()

	return (
		<Controller
			name={name}
			control={control}
			render={({ field, fieldState }) => (
				<DatePicker
					value={field.value ?? null}
					onChange={field.onChange}
					onBlur={field.onBlur}
					minValue={minValue}
					maxValue={maxValue}
					isRequired={isRequired}
					isInvalid={!!fieldState.error}
					className={className}
				>
					<Label>{label}</Label>
					<Group>
						<DateInput className="font-mono">
							{(segment) => <DateSegment segment={segment} />}
						</DateInput>
						<Button>Pick date</Button>
					</Group>
					<Popover>
						<Dialog>
							<Calendar>
								<header>
									<Button slot="previous">Previous</Button>
									<Heading />
									<Button slot="next">Next</Button>
								</header>
								<CalendarGrid>
									{(date) => <CalendarCell date={date} />}
								</CalendarGrid>
							</Calendar>
						</Dialog>
					</Popover>
					{fieldState.error && (
						<FieldError className="text-[var(--color-error)] text-[12px]">
							{fieldState.error.message}
						</FieldError>
					)}
				</DatePicker>
			)}
		/>
	)
}
