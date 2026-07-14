import { Link, useRouter } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

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
		<footer data-theme="dark" className="relative z-0 bg-[#101010] text-white">
			<div className="hq-page-shell">
				<div className="grid gap-10 border-b border-white/10 py-14 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-20 lg:py-20">
					<div className="max-w-[760px]">
						<p className="hq-kicker mb-5 text-[#75a2ff]">
							{t('footer.docketLocation')}
						</p>
						<h2 className="hq-display text-[clamp(2.5rem,7vw,6.5rem)] font-bold leading-[0.94] text-white">
							{t('cta.readyToBuild')}
						</h2>
						<p className="mt-5 max-w-[480px] text-[15px] leading-7 text-white/55 sm:text-[16px]">
							{t('hero.subheadline')}
						</p>
					</div>
					<Link
						to="/market"
						className="group inline-flex h-14 w-full items-center justify-between rounded-xl bg-[#2563eb] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#3b82f6] sm:w-[240px]"
					>
						{t('cta.browseMarket')}
						<ArrowUpRight
							size={18}
							className="icon-end transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
						/>
					</Link>
				</div>

				<div className="grid gap-12 py-12 sm:grid-cols-[1fr_auto] sm:items-start lg:py-16">
					<div className="flex items-start gap-4">
						<img
							src="/LyonWhite.svg"
							alt=""
							width={64}
							height={64}
							className="h-14 w-auto opacity-90 sm:h-16"
						/>
						<div>
							<p className="text-[22px] font-extrabold tracking-[-0.035em]">
								HyperQuote
							</p>
							<p className="mt-2 max-w-[300px] text-[13px] leading-6 text-white/45">
								{isAr ? t('footer.regionAr') : t('footer.regionEn')}
							</p>
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
						<span>{t('hero.address')}</span>
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
