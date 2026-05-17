import { Languages, Moon, MoreHorizontal, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button, DialogTrigger, Popover } from 'react-aria-components'

export interface DriverOption {
	icon: ReactNode
	isDisabled?: boolean
	label: string
	onPress: () => void
}

interface DriverOptionsMenuProps {
	label: string
	options: DriverOption[]
}

export function getDriverPreferenceOptions({
	languageLabel,
	onToggleLanguage,
	onToggleTheme,
	theme,
	themeLabel,
}: {
	languageLabel: string
	onToggleLanguage: () => void
	onToggleTheme: () => void
	theme: 'dark' | 'light'
	themeLabel: string
}): DriverOption[] {
	return [
		{
			icon: <Languages aria-hidden="true" size={16} />,
			label: languageLabel,
			onPress: onToggleLanguage,
		},
		{
			icon:
				theme === 'light' ? (
					<Moon aria-hidden="true" size={16} />
				) : (
					<Sun aria-hidden="true" size={16} />
				),
			label: themeLabel,
			onPress: onToggleTheme,
		},
	]
}

export function DriverOptionsMenu({ label, options }: DriverOptionsMenuProps) {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
			<Button
				aria-label={label}
				className="driver-control-button grid h-10 w-10 place-items-center border outline-none backdrop-blur focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
			>
				<MoreHorizontal aria-hidden="true" size={19} />
			</Button>
			<Popover
				placement="bottom end"
				offset={8}
				className="z-50 w-[min(13rem,calc(100vw-1.5rem))] border border-[var(--color-border)] bg-[var(--color-panel)] p-1.5 shadow-[0_18px_70px_rgba(17,17,17,0.18)] outline-none"
			>
				<div className="grid gap-1">
					{options.map((option) => (
						<Button
							className="grid h-10 grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 border border-transparent px-2 text-start text-xs font-semibold text-[var(--color-text)] outline-none hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:opacity-45"
							isDisabled={option.isDisabled}
							key={option.label}
							onPress={() => {
								option.onPress()
								setIsOpen(false)
							}}
						>
							<span className="grid h-6 w-6 place-items-center text-[var(--color-text-muted)]">
								{option.icon}
							</span>
							<span className="truncate">{option.label}</span>
						</Button>
					))}
				</div>
			</Popover>
		</DialogTrigger>
	)
}
