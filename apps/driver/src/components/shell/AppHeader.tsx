/**
 * Top app bar. 48px tall + safe-area top.
 *
 * Lead: truck plate · driver name (truncated on phone).
 * Trailing: settings menu (theme, language, sign out).
 */

import { useNavigate } from '@tanstack/react-router'
import { Globe, LogOut, Moon, MoreHorizontal, Sun } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../stores/auth'
import { useApp } from '../../stores/cockpit'

export function AppHeader() {
	const { t } = useTranslation()
	const session = useAuth((s) => s.session)
	const signOut = useAuth((s) => s.signOut)
	const { theme, lang, toggleTheme, setLang } = useApp()
	const navigate = useNavigate()
	const [open, setOpen] = useState(false)

	if (!session) return null

	return (
		<header className="app-header relative">
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-2)] font-medium text-[13px] text-[var(--ink-2)]">
					{session.driverName.slice(0, 1)}
				</div>
				<div className="flex min-w-0 flex-col leading-tight">
					<span className="truncate text-[14px] font-medium text-[var(--ink)]">
						{lang === 'ar' ? session.driverNameAr : session.driverName}
					</span>
					<span className="t-num truncate text-[11.5px] text-[var(--ink-3)]">
						{session.truckPlate} · {session.depot}
					</span>
				</div>
			</div>

			<button
				type="button"
				className="btn btn--ghost btn--icon"
				aria-label={t('app.menu')}
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
			>
				<MoreHorizontal size={18} />
			</button>

			{open ? (
				<>
					<button
						type="button"
						aria-label={t('app.closeMenu')}
						className="fixed inset-0 z-20 cursor-default bg-transparent"
						onClick={() => setOpen(false)}
					/>
					<div
						className="absolute end-3 top-full z-30 mt-2 w-[260px] rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--shadow-pop)]"
						role="menu"
					>
						<MenuItem
							icon={lang === 'en' ? <Globe size={16} /> : <Globe size={16} />}
							label={lang === 'en' ? 'العربية' : 'English'}
							sublabel={t('app.language')}
							onClick={() => {
								setLang(lang === 'en' ? 'ar' : 'en')
								setOpen(false)
							}}
						/>
						<MenuItem
							icon={theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
							label={theme === 'dark' ? t('app.lightMode') : t('app.darkMode')}
							sublabel={t('app.appearance')}
							onClick={() => {
								toggleTheme()
								setOpen(false)
							}}
						/>
						<hr className="my-1 border-0 border-t border-[var(--line)]" />
						<MenuItem
							icon={<LogOut size={16} />}
							label={t('app.signOut')}
							destructive
							onClick={() => {
								signOut()
								navigate({ to: '/login' })
							}}
						/>
					</div>
				</>
			) : null}
		</header>
	)
}

interface MenuItemProps {
	icon: React.ReactNode
	label: string
	sublabel?: string
	destructive?: boolean
	onClick: () => void
}

function MenuItem({
	icon,
	label,
	sublabel,
	destructive,
	onClick,
}: MenuItemProps) {
	return (
		<button
			type="button"
			role="menuitem"
			onClick={onClick}
			className="flex w-full items-center gap-3 rounded-[var(--r-sm)] px-3 py-2.5 text-start hover:bg-[var(--surface-2)]"
			style={{ color: destructive ? 'var(--critical)' : 'var(--ink)' }}
		>
			<span className="grid h-7 w-7 place-items-center rounded-[var(--r-xs)] bg-[var(--surface-2)] text-[var(--ink-2)]">
				{icon}
			</span>
			<span className="flex flex-1 flex-col leading-tight">
				<span className="text-[14px] font-medium">{label}</span>
				{sublabel ? (
					<span className="text-[11.5px] text-[var(--ink-3)]">{sublabel}</span>
				) : null}
			</span>
		</button>
	)
}
