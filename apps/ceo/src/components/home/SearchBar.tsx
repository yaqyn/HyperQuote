import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button, Input, SearchField } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

const HINT_KEYS = [
	'search.hint.general',
	'search.hint.example',
	'search.hint.invoices',
	'search.hint.ai',
] as const

const HINT_CYCLE_MS = 4000

interface SearchBarProps {
	value: string
	onChange: (value: string) => void
	onSubmit: (value: string) => void
}

export function SearchBar({ value, onChange, onSubmit }: SearchBarProps) {
	const { t } = useTranslation('ceo')
	const [hintIndex, setHintIndex] = useState(0)

	useEffect(() => {
		if (value) return
		const id = setInterval(() => {
			setHintIndex((i) => (i + 1) % HINT_KEYS.length)
		}, HINT_CYCLE_MS)
		return () => clearInterval(id)
	}, [value])

	const handleSubmit = useCallback(() => {
		const trimmed = value.trim()
		if (trimmed) onSubmit(trimmed)
	}, [value, onSubmit])

	return (
		<SearchField
			value={value}
			onChange={onChange}
			onSubmit={handleSubmit}
			aria-label={t('search.label')}
			className="w-[90%] max-w-[600px]"
		>
			<Input
				placeholder={t(HINT_KEYS[hintIndex])}
				className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none focus:ring-1 focus:ring-gray-400"
			/>
			{value && (
				<Button className="absolute end-3 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] outline-none">
					<X size={16} aria-hidden="true" />
				</Button>
			)}
		</SearchField>
	)
}
