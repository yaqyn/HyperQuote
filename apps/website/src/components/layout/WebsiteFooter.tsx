import { Link, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function WebsiteFooter() {
	const { t, i18n } = useTranslation('website')
	const isAr = i18n.language === 'ar'
	const [isDark, setIsDark] = useState(false)
	const router = useRouter()

	const handleClick = useCallback(
		(e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
			if (router.state.location.pathname === to) {
				e.preventDefault()
				window.scrollTo({ top: 0, behavior: 'smooth' })
			}
		},
		[router],
	)

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
		<footer
			dir="ltr"
			className="website-footer sticky bottom-0 z-0 flex min-h-[100svh] border-t border-[var(--color-text)]/[0.06] lg:min-h-0"
		>
			<div className="website-footer__inner mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col justify-between px-4 sm:px-6 md:px-8 lg:min-h-0 lg:px-6">
				{/* Main row: Brand | Links | Contact */}
				<div className="website-footer__main grid flex-1 content-center grid-cols-1 gap-10 py-12 sm:gap-12 sm:py-14 lg:flex-none lg:grid-cols-[1fr_auto] lg:gap-20 lg:py-20">
					{/* Brand */}
					<div className="website-footer__brand flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center sm:text-start lg:justify-start">
						<img
							src={isDark ? '/LyonWhite.svg' : '/LyonBlack.svg'}
							alt=""
							className="website-footer__logo h-24 w-auto sm:h-28 lg:h-36"
						/>
						<div className="flex flex-col items-center sm:items-start sm:pt-2 lg:pt-3">
							<span className="text-[28px] font-extrabold leading-none tracking-normal sm:text-[30px]">
								HyperQuote
							</span>
							<span className="website-footer__summary mt-3 max-w-[260px] text-[13px] leading-[1.55] opacity-40 sm:max-w-[220px] lg:max-w-[200px]">
								{t('hero.subheadline').split('.')[0]}.
							</span>
							<div className="website-footer__actions mt-5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
								<a
									href="https://maps.google.com/?q=Arkan+Plaza+Sheikh+Zayed+Egypt"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex min-h-9 items-center rounded-lg bg-[var(--color-text)]/[0.04] px-3 py-1.5 text-[12px] tracking-normal opacity-50 transition-opacity hover:opacity-70"
								>
									{t('hero.visitUs')}
								</a>
								<a
									href="https://portal.hyperquote.net"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-[12px] font-semibold tracking-normal text-white transition-opacity hover:opacity-85"
								>
									Portal ↗
								</a>
							</div>
						</div>
					</div>

					{/* Links — two columns side by side */}
					<div className="website-footer__links mx-auto grid w-full max-w-[420px] grid-cols-2 gap-8 border-t border-[var(--color-text)]/[0.06] pt-8 text-center sm:max-w-[480px] sm:gap-12 lg:mx-0 lg:w-auto lg:max-w-none lg:grid-cols-2 lg:gap-16 lg:border-0 lg:pt-3 lg:text-start">
						<div className="min-w-0">
							<h3 className="mb-4 text-[11px] font-medium uppercase tracking-normal opacity-30">
								{t('footer.platform')}
							</h3>
							<ul className="website-footer__navlist flex flex-col gap-3">
								<li>
									<Link
										to="/login"
										onClick={(e) => handleClick(e, '/login')}
										className="website-footer__navlink inline-flex min-h-8 items-center justify-center text-[13px] opacity-50 transition-opacity hover:opacity-75 lg:justify-start"
									>
										{t('login.step1.heading')}
									</Link>
								</li>
								<li>
									<Link
										to="/market"
										onClick={(e) => handleClick(e, '/market')}
										className="website-footer__navlink inline-flex min-h-8 items-center justify-center text-[13px] opacity-50 transition-opacity hover:opacity-75 lg:justify-start"
									>
										{t('footer.browseMarket')}
									</Link>
								</li>
								<li>
									<Link
										to="/support"
										onClick={(e) => handleClick(e, '/support')}
										className="website-footer__navlink inline-flex min-h-8 items-center justify-center text-[13px] opacity-50 transition-opacity hover:opacity-75 lg:justify-start"
									>
										{t('footer.support')}
									</Link>
								</li>
							</ul>
						</div>
						<div className="min-w-0">
							<h3 className="mb-4 text-[11px] font-medium uppercase tracking-normal opacity-30">
								{t('footer.company')}
							</h3>
							<ul className="website-footer__navlist flex flex-col gap-3">
								<li>
									<Link
										to="/about"
										onClick={(e) => handleClick(e, '/about')}
										className="website-footer__navlink inline-flex min-h-8 items-center justify-center text-[13px] opacity-50 transition-opacity hover:opacity-75 lg:justify-start"
									>
										{t('footer.aboutUs')}
									</Link>
								</li>
								<li>
									<Link
										to="/careers"
										onClick={(e) => handleClick(e, '/careers')}
										className="website-footer__navlink inline-flex min-h-8 items-center justify-center text-[13px] opacity-50 transition-opacity hover:opacity-75 lg:justify-start"
									>
										{t('footer.careers')}
									</Link>
								</li>
								<li>
									<Link
										to="/docs"
										onClick={(e) => handleClick(e, '/docs')}
										className="website-footer__navlink inline-flex min-h-8 items-center justify-center text-[13px] opacity-50 transition-opacity hover:opacity-75 lg:justify-start"
									>
										{t('footer.docs')}
									</Link>
								</li>
							</ul>
						</div>
					</div>
				</div>

				{/* Bottom */}
				<div className="website-footer__bottom flex flex-col items-center justify-center gap-4 border-t border-[var(--color-text)]/[0.06] py-6 text-center">
					<span className="text-[12px] opacity-25">
						{t('footer.copyright')}
					</span>
					<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
						<Link
							to="/legal/privacy"
							onClick={(e) => handleClick(e, '/legal/privacy')}
							className="website-footer__legal-link inline-flex min-h-8 items-center text-[12px] opacity-30 transition-opacity hover:opacity-55"
						>
							{t('footer.privacyPolicy')}
						</Link>
						<Link
							to="/legal/terms"
							onClick={(e) => handleClick(e, '/legal/terms')}
							className="website-footer__legal-link inline-flex min-h-8 items-center text-[12px] opacity-30 transition-opacity hover:opacity-55"
						>
							{t('footer.termsOfUse')}
						</Link>
						<span className="website-footer__legal-link inline-flex min-h-8 items-center text-[12px] opacity-30">
							{isAr ? t('footer.regionAr') : t('footer.regionEn')}
						</span>
					</div>
				</div>
			</div>
		</footer>
	)
}
