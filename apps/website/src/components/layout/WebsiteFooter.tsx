import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function WebsiteFooter() {
	const { t, i18n } = useTranslation('website')
	const isAr = i18n.language === 'ar'

	return (
		<footer className="bg-[var(--color-base-alt)]">
			<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 py-16 px-6 max-w-7xl mx-auto">
				{/* Brand Column */}
				<div>
					<span className="font-semibold text-xl text-[var(--color-text)]">
						HyperQuote
					</span>
				</div>

				{/* Platform Column */}
				<div>
					<h3 className="uppercase text-xs font-semibold text-[var(--color-text-muted)] mb-4">
						{t('footer.platform')}
					</h3>
					<ul className="space-y-2">
						<li>
							<Link
								to="/portal"
								className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
							>
								{t('footer.getQuote')}
							</Link>
						</li>
						<li>
							<Link
								to="/market"
								className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
							>
								{t('footer.browseMarket')}
							</Link>
						</li>
						<li>
							<Link
								to="/portal"
								className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
							>
								{t('footer.trackOrder')}
							</Link>
						</li>
					</ul>
				</div>

				{/* Company Column */}
				<div>
					<h3 className="uppercase text-xs font-semibold text-[var(--color-text-muted)] mb-4">
						{t('footer.company')}
					</h3>
					<ul className="space-y-2">
						<li>
							<Link
								to="/about"
								className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
							>
								{t('footer.aboutUs')}
							</Link>
						</li>
						<li>
							<Link
								to="/support"
								className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
							>
								{t('footer.support')}
							</Link>
						</li>
						<li>
							<Link
								to="/careers"
								className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
							>
								{t('footer.careers')}
							</Link>
						</li>
						<li>
							<Link
								to="/docs"
								className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
							>
								{t('footer.docs')}
							</Link>
						</li>
					</ul>
				</div>

				{/* Legal Column */}
				<div>
					<h3 className="uppercase text-xs font-semibold text-[var(--color-text-muted)] mb-4">
						{t('footer.legal')}
					</h3>
					<ul className="space-y-2">
						<li>
							<Link
								to="/privacy"
								className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
							>
								{t('footer.privacyPolicy')}
							</Link>
						</li>
						<li>
							<Link
								to="/terms"
								className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
							>
								{t('footer.termsOfUse')}
							</Link>
						</li>
					</ul>
				</div>
			</div>

			{/* Bottom Bar */}
			<div className="border-t border-[var(--color-border)] px-6">
				<div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto py-6 gap-2">
					<span className="text-sm text-[var(--color-text-muted)]">
						{t('footer.copyright')}
					</span>
					<span className="text-sm text-[var(--color-text-muted)]">
						{isAr ? t('footer.regionAr') : t('footer.regionEn')}
					</span>
				</div>
			</div>
		</footer>
	)
}
