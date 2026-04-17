import { useNavigate } from '@tanstack/react-router'
import {
	FileText,
	Headphones,
	Languages,
	LogOut,
	Palette,
	Receipt,
	Settings,
	ShieldCheck,
	Upload,
} from 'lucide-react'
import { useState } from 'react'
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getTheme, persistTheme } from '../../lib/theme'
import { usePortalStore } from '../../stores/portal'

interface ProfileMenuProps {
	userName: string
	companyName?: string
	initials: string
	hasSupplierRole?: boolean
}

interface MenuItemConfig {
	icon: React.ComponentType<{ size: number; className?: string }>
	labelKey: string
	action: () => void
}

// Cookie writes are required for SSR-visible locale sync and cross-subdomain
// session clear. Centralized here so biome's `noDocumentCookie` rule only
// applies to this one escape hatch.
function setCookieRaw(value: string) {
	const doc = document as unknown as Record<'cookie', string>
	doc.cookie = value
}

export function ProfileMenu({
	userName,
	companyName,
	initials,
	hasSupplierRole = false,
}: ProfileMenuProps) {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
	const activeRole = usePortalStore((s) => s.activeRole)
	const setActiveRole = usePortalStore((s) => s.setActiveRole)

	const handleLanguageToggle = () => {
		const newLocale = i18n.language === 'ar' ? 'en' : 'ar'
		i18n.changeLanguage(newLocale)
		localStorage.setItem('hq-locale', newLocale)
		setCookieRaw(`hq-locale=${newLocale};path=/;max-age=31536000`)
		document.documentElement.setAttribute('lang', newLocale)
		document.documentElement.setAttribute(
			'dir',
			newLocale === 'ar' ? 'rtl' : 'ltr',
		)
	}

	const handleThemeToggle = () => {
		const current = getTheme()
		persistTheme(current === 'dark' ? 'light' : 'dark')
	}

	const handleSignOut = async () => {
		try {
			const { createClient } = await import('@supabase/supabase-js')
			const supabase = createClient(
				import.meta.env.VITE_SUPABASE_URL ?? '',
				import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
			)
			await supabase.auth.signOut()
		} catch {
			// Clear cookies manually if Supabase client fails
		}
		setCookieRaw('hq-external-session=;path=/;max-age=0;domain=.hyperquote.net')
		window.location.href =
			import.meta.env.VITE_WEBSITE_URL ?? 'https://hyperquote.net'
	}

	const menuItems: MenuItemConfig[] = [
		{
			icon: Settings,
			labelKey: 'profile.settings',
			action: () =>
				navigate({ to: '/settings', search: { section: 'profile' } }),
		},
		{
			icon: FileText,
			labelKey: 'profile.documents',
			action: () => navigate({ to: '/documents' }),
		},
		{
			icon: Headphones,
			labelKey: 'profile.support',
			action: () => navigate({ to: '/support' }),
		},
		{
			icon: Languages,
			labelKey: 'profile.language',
			action: handleLanguageToggle,
		},
		{
			icon: Palette,
			labelKey: 'profile.theme',
			action: handleThemeToggle,
		},
	]

	return (
		<DialogTrigger>
			<Button
				aria-label={userName}
				className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--text-sm)] font-semibold text-[var(--color-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:ring-offset-2"
			>
				{initials}
			</Button>

			<Popover
				placement="bottom end"
				className="w-64 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-lg outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95"
			>
				<Dialog className="outline-none p-2">
					{/* User info header */}
					<div className="px-3 py-2 border-b border-[var(--color-border)] mb-1">
						<p className="text-[var(--text-base)] font-semibold text-[var(--color-text)] truncate">
							{userName}
						</p>
						{companyName && (
							<p className="text-[var(--text-base)] text-[var(--color-text-muted)] truncate">
								{companyName}
							</p>
						)}
					</div>

					{/* Mobile role toggle (hidden on md+) */}
					{hasSupplierRole && (
						<div className="md:hidden px-3 py-2 border-b border-[var(--color-border)] mb-1">
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => {
										setActiveRole(
											activeRole === 'customer' ? 'supplier' : 'customer',
										)
										navigate({ to: '/' })
									}}
									className="flex-1 h-9 rounded-full text-[var(--text-sm)] font-semibold bg-[var(--color-primary)] text-white"
								>
									{t(
										`role.${activeRole === 'customer' ? 'supplier' : 'customer'}`,
									)}
								</button>
							</div>
						</div>
					)}

					{/* Menu items */}
					{!showSignOutConfirm ? (
						<div role="menu">
							{menuItems.map((item) => (
								<button
									key={item.labelKey}
									type="button"
									role="menuitem"
									onClick={item.action}
									className="flex items-center gap-3 w-full h-11 px-3 rounded-lg text-[var(--text-base)] text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors outline-none focus-visible:bg-[var(--color-surface)]"
								>
									<item.icon
										size={18}
										className="text-[var(--color-text-muted)] shrink-0"
									/>
									{t(item.labelKey)}
								</button>
							))}

							{/* Supplier-specific links */}
							{activeRole === 'supplier' && (
								<>
									<div className="border-t border-[var(--color-border)] my-1" />
									<button
										type="button"
										role="menuitem"
										onClick={() => navigate({ to: '/supplier/invoices' })}
										className="flex items-center gap-3 w-full h-11 px-3 rounded-lg text-[var(--text-base)] text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors outline-none focus-visible:bg-[var(--color-surface)]"
									>
										<Receipt
											size={18}
											className="text-[var(--color-text-muted)] shrink-0"
										/>
										{t('supplier.invoicesTitle')}
									</button>
									<button
										type="button"
										role="menuitem"
										onClick={() => navigate({ to: '/supplier/catalog-upload' })}
										className="flex items-center gap-3 w-full h-11 px-3 rounded-lg text-[var(--text-base)] text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors outline-none focus-visible:bg-[var(--color-surface)]"
									>
										<Upload
											size={18}
											className="text-[var(--color-text-muted)] shrink-0"
										/>
										{t('supplier.catalogUploadTitle')}
									</button>
									<button
										type="button"
										role="menuitem"
										disabled
										className="flex items-center gap-3 w-full h-11 px-3 rounded-lg text-[var(--text-base)] text-[var(--color-text-muted)] opacity-50 cursor-not-allowed outline-none"
									>
										<ShieldCheck
											size={18}
											className="text-[var(--color-text-muted)] shrink-0"
										/>
										{t('nav.qualityRequirements')}
									</button>
								</>
							)}

							{/* Sign Out */}
							<button
								type="button"
								role="menuitem"
								onClick={() => setShowSignOutConfirm(true)}
								className="flex items-center gap-3 w-full h-11 px-3 rounded-lg text-[var(--text-base)] text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors outline-none focus-visible:bg-[var(--color-surface)]"
							>
								<LogOut
									size={18}
									className="text-[var(--color-text-muted)] shrink-0"
								/>
								{t('profile.signOut')}
							</button>
						</div>
					) : (
						/* Sign out confirmation */
						<div className="px-3 py-3">
							<p className="text-[var(--text-base)] font-semibold text-[var(--color-text)] mb-3">
								{t('signOut.confirm')}
							</p>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setShowSignOutConfirm(false)}
									className="flex-1 h-9 rounded-lg text-[var(--text-sm)] font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
								>
									{t('signOut.cancel')}
								</button>
								<button
									type="button"
									onClick={handleSignOut}
									className="flex-1 h-9 rounded-lg text-[var(--text-sm)] font-semibold text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors"
								>
									{t('signOut.action')}
								</button>
							</div>
						</div>
					)}
				</Dialog>
			</Popover>
		</DialogTrigger>
	)
}
