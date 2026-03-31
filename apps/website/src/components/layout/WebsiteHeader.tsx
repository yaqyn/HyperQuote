import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useScrolled } from '../../hooks/useScrolled'
import { LanguageToggle } from './LanguageToggle'
import { ThemeToggle } from './ThemeToggle'
import { MobileNavOverlay } from './MobileNavOverlay'

export function WebsiteHeader() {
	const { t } = useTranslation('website')
	const scrolled = useScrolled(8)
	const [mobileNavOpen, setMobileNavOpen] = useState(false)
	const [isDark, setIsDark] = useState(false)

	useEffect(() => {
		function checkTheme() {
			setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
		}
		checkTheme()
		const observer = new MutationObserver(checkTheme)
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme'],
		})
		return () => observer.disconnect()
	}, [])

	const navLinkClass =
		'text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors'
	const navLinkActiveClass =
		'text-sm font-medium text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] pb-1'

	return (
		<>
			<header
				className={`fixed top-0 inset-x-0 z-40 h-16 max-md:h-14 flex items-center justify-between px-6 transition-all duration-200 ${
					scrolled
						? 'bg-[color-mix(in_srgb,var(--color-base)_80%,transparent)] backdrop-blur-[12px]'
						: 'bg-[var(--color-base)]'
				}`}
			>
				{/* Logo */}
				<Link to="/" aria-label={t('a11y.home')}>
					<img
						src={isDark ? '/LyonWhite.svg' : '/LyonBlack.svg'}
						alt=""
						height={28}
						className="h-7"
					/>
				</Link>

				{/* Desktop Nav */}
				<nav className="hidden md:flex items-center gap-6">
					<Link
						to="/market"
						className={navLinkClass}
						activeProps={{ className: navLinkActiveClass }}
					>
						{t('nav.market')}
					</Link>
					<Link
						to="/about"
						className={navLinkClass}
						activeProps={{ className: navLinkActiveClass }}
					>
						{t('nav.about')}
					</Link>
					<Link
						to="/support"
						className={navLinkClass}
						activeProps={{ className: navLinkActiveClass }}
					>
						{t('nav.support')}
					</Link>
					<Link
						to="/docs"
						className={navLinkClass}
						activeProps={{ className: navLinkActiveClass }}
					>
						{t('nav.docs')}
					</Link>
				</nav>

				{/* Right Cluster */}
				<div className="flex items-center gap-2">
					<LanguageToggle />
					<ThemeToggle />
					<Link
						to="/portal"
						className="hidden md:inline-flex items-center bg-[var(--color-primary)] text-white font-semibold text-sm h-9 px-4 rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
					>
						{t('cta.getQuote')}
					</Link>
					<button
						type="button"
						onClick={() => setMobileNavOpen(true)}
						aria-label={t('a11y.openNav')}
						className="md:hidden p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
					>
						<Menu size={24} />
					</button>
				</div>
			</header>

			<MobileNavOverlay
				isOpen={mobileNavOpen}
				onClose={() => setMobileNavOpen(false)}
			/>
		</>
	)
}
