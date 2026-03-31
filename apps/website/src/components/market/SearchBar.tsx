import { useRef, useCallback } from 'react'
import { SearchField, Input, Button } from 'react-aria-components'
import { Search, X } from 'lucide-react'
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
			if (timerRef.current) {
				clearTimeout(timerRef.current)
			}
			timerRef.current = setTimeout(() => {
				onSearch(value)
			}, 300)
		},
		[onSearch],
	)

	return (
		<SearchField
			defaultValue={defaultValue}
			onChange={handleChange}
			aria-label={t('market.searchPlaceholder')}
			className="relative w-full"
		>
			<Search
				size={20}
				className="absolute top-1/2 -translate-y-1/2 inset-is-3 text-[var(--color-text-muted)] pointer-events-none z-10"
				aria-hidden="true"
			/>
			<Input
				placeholder={t('market.searchPlaceholder')}
				className="w-full h-12 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] ps-10 pe-10 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-shadow"
			/>
			<Button className="absolute top-1/2 -translate-y-1/2 inset-ie-3 text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded-md transition-colors data-[empty]:hidden">
				<X size={16} aria-hidden="true" />
			</Button>
		</SearchField>
	)
}
