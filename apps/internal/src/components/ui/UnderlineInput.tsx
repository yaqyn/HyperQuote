import { Input, TextArea, TextField } from 'react-aria-components'

interface UnderlineInputProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	label: string
	className?: string
}

function UnderlineInput({
	value,
	onChange,
	placeholder,
	label,
	className = '',
}: UnderlineInputProps) {
	return (
		<TextField aria-label={label}>
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={`w-full border-b border-black/[0.04] bg-transparent py-1.5 text-[13px] outline-none transition-colors
          placeholder:text-black/30 focus:border-black/[0.12]
          dark:border-white/[0.04] dark:placeholder:text-white/30 dark:focus:border-white/[0.12]
          ${className}`}
			/>
		</TextField>
	)
}

interface UnderlineTextAreaProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	label: string
	rows?: number
	className?: string
}

export function UnderlineTextArea({
	value,
	onChange,
	placeholder,
	label,
	rows = 1,
	className = '',
}: UnderlineTextAreaProps) {
	const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
		const el = e.currentTarget
		el.style.height = 'auto'
		el.style.height = `${el.scrollHeight}px`
	}

	return (
		<TextArea
			aria-label={label}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			onInput={handleInput}
			placeholder={placeholder}
			rows={rows}
			className={`w-full border-b border-black/[0.04] bg-transparent py-1.5 text-[13px] outline-none transition-colors resize-none overflow-hidden
        placeholder:text-black/30 focus:border-black/[0.12]
        dark:border-white/[0.04] dark:placeholder:text-white/30 dark:focus:border-white/[0.12]
        ${className}`}
		/>
	)
}
