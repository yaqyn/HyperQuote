import { useEffect, useState, useCallback } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function WebsiteFooter() {
	const { t, i18n } = useTranslation('website')
	const isAr = i18n.language === 'ar'
	const [isDark, setIsDark] = useState(false)
	const router = useRouter()

	const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
		if (router.state.location.pathname === to) {
			e.preventDefault()
			window.scrollTo({ top: 0, behavior: 'smooth' })
		}
	}, [router])

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

	return (
		<footer className="sticky bottom-0 z-0 border-t border-[var(--color-text)]/[0.06]">
			<div className="mx-auto max-w-7xl px-6">
				{/* Main row: Brand | Links | Contact */}
				<div className="grid grid-cols-1 gap-14 py-16 lg:grid-cols-[1fr_auto_auto] lg:gap-20 lg:py-20">
					{/* Brand */}
					<div className="flex items-start gap-5">
						<img
							src={isDark ? '/LyonWhite.svg' : '/LyonBlack.svg'}
							alt=""
							className="h-36 w-auto"
						/>
						<div className="flex flex-col pt-3">
							<span className="text-[30px] font-extrabold leading-none tracking-[-0.03em]">
								HyperQuote
							</span>
							<span className="mt-3 max-w-[200px] text-[13px] leading-[1.5] opacity-35">
								{t('hero.subheadline').split('.')[0]}.
							</span>
							<a
								href="https://maps.google.com/?q=Arkan+Plaza+Sheikh+Zayed+Egypt"
								target="_blank"
								rel="noopener noreferrer"
								className="mt-4 inline-flex self-start bg-[var(--color-text)]/[0.04] px-3 py-1.5 text-[11px] tracking-wide opacity-40 transition-opacity hover:opacity-65"
							>
								Arkan Plaza, Sheikh Zayed ↗
							</a>
						</div>
					</div>

					{/* Links — two columns side by side */}
					<div className="flex gap-16">
						<div>
							<h3 className="mb-4 text-[11px] font-medium uppercase tracking-[.1em] opacity-25">
								{t('footer.platform')}
							</h3>
							<ul className="flex flex-col gap-2.5">
								<li><Link to="/portal" onClick={(e) => handleClick(e, '/portal')} className="text-[13px] opacity-45 transition-opacity hover:opacity-75">{t('footer.getQuote')}</Link></li>
								<li><Link to="/market" onClick={(e) => handleClick(e, '/market')} className="text-[13px] opacity-45 transition-opacity hover:opacity-75">{t('footer.browseMarket')}</Link></li>
								<li><Link to="/portal" onClick={(e) => handleClick(e, '/portal')} className="text-[13px] opacity-45 transition-opacity hover:opacity-75">{t('footer.trackOrder')}</Link></li>
							</ul>
						</div>
						<div>
							<h3 className="mb-4 text-[11px] font-medium uppercase tracking-[.1em] opacity-25">
								{t('footer.company')}
							</h3>
							<ul className="flex flex-col gap-2.5">
								<li><Link to="/about" onClick={(e) => handleClick(e, '/about')} className="text-[13px] opacity-45 transition-opacity hover:opacity-75">{t('footer.aboutUs')}</Link></li>
								<li><Link to="/careers" onClick={(e) => handleClick(e, '/careers')} className="text-[13px] opacity-45 transition-opacity hover:opacity-75">{t('footer.careers')}</Link></li>
								<li><Link to="/docs" onClick={(e) => handleClick(e, '/docs')} className="text-[13px] opacity-45 transition-opacity hover:opacity-75">{t('footer.docs')}</Link></li>
							</ul>
						</div>
					</div>

					{/* Contact */}
					<div>
						<h3 className="mb-4 text-[11px] font-medium uppercase tracking-[.1em] opacity-25">
							{t('support.sectionContact')}
						</h3>
						<div className="flex flex-col gap-2">
							<a
								href="https://wa.me/201234567890"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex bg-[var(--color-text)]/[0.04] px-3 py-1.5 text-[11px] tracking-wide opacity-45 transition-opacity hover:opacity-70"
							>
								WhatsApp ↗
							</a>
							<Link
								to="/support"
								onClick={(e) => handleClick(e, '/support')}
								className="inline-flex bg-[var(--color-text)]/[0.04] px-3 py-1.5 text-[11px] tracking-wide opacity-45 transition-opacity hover:opacity-70"
							>
								Support
							</Link>
						</div>
					</div>
				</div>

				{/* Bottom */}
				<div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--color-text)]/[0.06] py-6 md:flex-row">
					<span className="text-[12px] opacity-25">
						{t('footer.copyright')}
					</span>
					<div className="flex gap-4">
						<Link to="/legal/privacy" onClick={(e) => handleClick(e, '/legal/privacy')} className="text-[12px] opacity-25 transition-opacity hover:opacity-50">
							{t('footer.privacyPolicy')}
						</Link>
						<Link to="/legal/terms" onClick={(e) => handleClick(e, '/legal/terms')} className="text-[12px] opacity-25 transition-opacity hover:opacity-50">
							{t('footer.termsOfUse')}
						</Link>
						<span className="text-[12px] opacity-25">
							{isAr ? t('footer.regionAr') : t('footer.regionEn')}
						</span>
					</div>
				</div>
			</div>
		</footer>
	)
}
