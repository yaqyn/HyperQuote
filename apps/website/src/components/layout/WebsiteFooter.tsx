import { Link, useRouter } from '@tanstack/react-router'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { COMPANY_LOCATION_HREF } from '../../lib/company'
import { getPortalHref } from '../../lib/portal-url'

const PLATFORM_LINKS = [
	{ to: '/market', label: 'footer.browseMarket' },
	{ to: '/login', label: 'login.step1.heading' },
	{ to: '/support', label: 'footer.support' },
] as const

const COMPANY_LINKS = [
	{ to: '/about', label: 'footer.aboutUs' },
	{ to: '/careers', label: 'footer.careers' },
	{ to: '/docs', label: 'footer.docs' },
] as const

export function WebsiteFooter() {
	const { t, i18n } = useTranslation('website')
	const isAr = i18n.language === 'ar'
	const router = useRouter()

	const handleClick = useCallback(
		(e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
			if (router.state.location.pathname !== to) return
			e.preventDefault()
			window.scrollTo({ top: 0, behavior: 'smooth' })
		},
		[router],
	)

	return (
		<footer
			data-theme="dark"
			className="relative z-0 isolate overflow-hidden bg-[#101010] text-white"
		>
			<div className="hq-page-shell relative">
				<div className="grid gap-14 py-14 sm:py-16 lg:grid-cols-[minmax(0,1.15fr)_auto] lg:items-start lg:gap-24 lg:py-20">
					<div className="max-w-[620px]">
						<Link
							to="/"
							onClick={(event) => handleClick(event, '/')}
							className="inline-flex items-center gap-5 sm:gap-7"
						>
							<img
								src="/LyonWhite.svg"
								alt=""
								width={112}
								height={112}
								className="h-24 w-24 shrink-0 object-contain opacity-95 sm:h-28 sm:w-28"
							/>
							<div>
								<p className="text-[30px] font-extrabold tracking-[-0.045em] sm:text-[38px]">
									HyperQuote
								</p>
								<p className="mt-2 max-w-[340px] text-[13px] leading-6 text-white/50 sm:text-[14px]">
									{t('footer.tagline')}
								</p>
							</div>
						</Link>

						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
							<a
								href={getPortalHref()}
								className="hq-action hq-action--white h-12 sm:min-w-[180px]"
							>
								{t('footer.openPortal')}
								<ArrowUpRight size={16} className="hq-action__icon icon-end" />
							</a>
							<a
								href={COMPANY_LOCATION_HREF}
								target="_blank"
								rel="noopener noreferrer"
								className="hq-action hq-action--ghost-light h-12 sm:min-w-[180px]"
							>
								{t('footer.getDirections')}
								<MapPin size={15} className="hq-action__icon" />
							</a>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-x-12 gap-y-8 sm:gap-x-20">
						<FooterLinkGroup
							title={t('footer.platform')}
							links={PLATFORM_LINKS.map((link) => ({
								to: link.to,
								label: t(link.label),
							}))}
							onClick={handleClick}
						/>
						<FooterLinkGroup
							title={t('footer.company')}
							links={COMPANY_LINKS.map((link) => ({
								to: link.to,
								label: t(link.label),
							}))}
							onClick={handleClick}
						/>
					</div>
				</div>

				<div className="flex flex-col gap-4 border-t border-white/10 py-6 text-[11px] text-white/35 sm:flex-row sm:items-center sm:justify-between">
					<span>{t('footer.copyright')}</span>
					<div className="flex flex-wrap gap-x-5 gap-y-2">
						<Link
							to="/legal/privacy"
							className="transition-colors hover:text-white/70"
						>
							{t('footer.privacyPolicy')}
						</Link>
						<Link
							to="/legal/terms"
							className="transition-colors hover:text-white/70"
						>
							{t('footer.termsOfUse')}
						</Link>
						<span>{isAr ? t('footer.regionAr') : t('footer.regionEn')}</span>
					</div>
				</div>
			</div>
		</footer>
	)
}

function FooterLinkGroup({
	title,
	links,
	onClick,
}: {
	title: string
	links: Array<{ to: string; label: string }>
	onClick: (event: React.MouseEvent<HTMLAnchorElement>, to: string) => void
}) {
	return (
		<div>
			<h3 className="hq-kicker mb-4 text-white/30">{title}</h3>
			<ul className="space-y-3">
				{links.map((link) => (
					<li key={link.to}>
						<Link
							to={link.to}
							onClick={(event) => onClick(event, link.to)}
							className="text-[13px] text-white/55 transition-colors hover:text-white"
						>
							{link.label}
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}
