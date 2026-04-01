import { useRef, useCallback } from 'react'
import { SearchField, Input, Button } from 'react-aria-components'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SearchBarProps {
	defaultValue?: string
	onSearch: (query: string) => void
}

export function SearchBar({ defaultValue, onSearch }: SearchBarProps) {
	const { t } = useTranslation('website')
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const handleChange = useCallback(
		(value: string) => {
			if (timerRef.current) clearTimeout(timerRef.current)
			timerRef.current = setTimeout(() => onSearch(value), 300)
		},
		[onSearch],
	)

	return (
		<SearchField
			defaultValue={defaultValue}
			onChange={handleChange}
			aria-label={t('market.searchPlaceholder')}
			className="relative w-full max-w-sm"
		>
			<Input
				placeholder={t('market.searchPlaceholder')}
				className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-transparent px-3 pe-8 text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none focus:border-[var(--color-primary)] transition-colors"
			/>
			<Button className="absolute top-1/2 -translate-y-1/2 inset-ie-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-0.5 rounded transition-colors data-[empty]:hidden">
				<X size={14} aria-hidden="true" />
			</Button>
		</SearchField>
	)
}
