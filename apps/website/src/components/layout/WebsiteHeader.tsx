import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, ShoppingCart, X, Minus, Plus, Trash2, Copy, StickyNote, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useScrolled } from '../../hooks/useScrolled'
import { LanguageToggle } from './LanguageToggle'
import { ThemeToggle } from './ThemeToggle'
import { MobileNavOverlay } from './MobileNavOverlay'
import { useQuoteCart } from '../../hooks/useQuoteCart'
import { useLoginModal } from '../../hooks/useLoginModal'

export function WebsiteHeader() {
	const { t } = useTranslation('website')
	const scrolled = useScrolled(8)
	const [mobileNavOpen, setMobileNavOpen] = useState(false)
	const [cartOpen, setCartOpen] = useState(false)
	const [isDark, setIsDark] = useState(false)
	const { items, updateQuantity, updateNote, remove, clear, duplicate, globalNote, setGlobalNote } = useQuoteCart()
	const { open: openLoginModal } = useLoginModal()
	const [showGlobalNote, setShowGlobalNote] = useState(false)
	const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

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
				dir="ltr"
				className={`fixed top-0 inset-x-0 z-40 h-16 max-md:h-14 flex items-center justify-between px-6 transition-all duration-200 ${
					scrolled
						? 'bg-[color-mix(in_srgb,var(--color-base)_80%,transparent)] backdrop-blur-[12px]'
						: 'bg-[var(--color-base)]'
				}`}
			>
				{/* Logo + Brand */}
				<Link to="/" aria-label={t('a11y.home')} className="flex items-center gap-3">
					<img
						src={isDark ? '/LyonWhite.svg' : '/LyonBlack.svg'}
						alt=""
						className="h-10 max-md:h-8"
					/>
					<span className="text-[20px] max-md:text-[17px] font-extrabold tracking-[-0.02em] text-[var(--color-text)]">
						HyperQuote
					</span>
				</Link>

				{/* Desktop Nav */}
				<nav className="hidden md:flex items-center gap-6">
					<Link to="/market" className={navLinkClass} activeProps={{ className: navLinkActiveClass }}>
						{t('nav.market')}
					</Link>
					<Link to="/about" className={navLinkClass} activeProps={{ className: navLinkActiveClass }}>
						{t('nav.about')}
					</Link>
					<Link to="/support" className={navLinkClass} activeProps={{ className: navLinkActiveClass }}>
						{t('nav.support')}
					</Link>
					<Link to="/docs" className={navLinkClass} activeProps={{ className: navLinkActiveClass }}>
						{t('nav.docs')}
					</Link>
				</nav>

				{/* Right Cluster */}
				<div className="flex items-center gap-2">
					<LanguageToggle />
					<ThemeToggle />

					{/* Cart toggle */}
					<button
						type="button"
						onClick={() => setCartOpen(!cartOpen)}
						className="relative p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
						aria-label={t('cart.label')}
					>
						<ShoppingCart size={20} className="text-[var(--color-text-muted)]" />
						{items.length > 0 && (
							<span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center px-1">
								{items.length}
							</span>
						)}
					</button>

					<button
						type="button"
						onClick={() => openLoginModal('/portal/quote')}
						className="hidden md:inline-flex items-center bg-[var(--color-primary)] text-white font-semibold text-sm h-9 px-4 rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
					>
						{t('cta.getQuote')}
					</button>
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

			{/* Cart dropdown panel */}
			{cartOpen && (
				<>
					<div
						className="fixed inset-0 z-45"
						onClick={() => setCartOpen(false)}
						onKeyDown={() => {}}
						role="presentation"
					/>
					<div className="fixed top-16 end-4 z-50 w-[380px] max-h-[80vh] bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden flex flex-col">
						{/* Header */}
						<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
							<div>
								<span className="text-[14px] font-semibold text-[var(--color-text)]">
									{t('cart.title')}
								</span>
								{items.length > 0 && (
									<span className="text-[12px] text-[var(--color-text-muted)] ms-1.5">
										{items.length} {items.length === 1 ? 'item' : 'items'} · {items.reduce((s, i) => s + i.quantity, 0)} units
									</span>
								)}
							</div>
							<div className="flex items-center gap-1.5">
								{items.length > 0 && (
									<button type="button" onClick={clear} className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--color-surface)]">
										{t('cart.clearAll')}
									</button>
								)}
								<button type="button" onClick={() => setCartOpen(false)} className="p-1 rounded hover:bg-[var(--color-surface)]">
									<X size={15} className="text-[var(--color-text-muted)]" />
								</button>
							</div>
						</div>

						{/* Items */}
						{items.length === 0 ? (
							<div className="px-4 py-10 text-center">
								<ShoppingCart size={28} className="mx-auto text-[var(--color-text-subtle)] mb-3" />
								<p className="text-[14px] font-medium text-[var(--color-text)] mb-1">{t('cart.emptyTitle')}</p>
								<p className="text-[13px] text-[var(--color-text-muted)] mb-3">{t('cart.empty')}</p>
								<Link
									to="/market"
									onClick={() => setCartOpen(false)}
									className="text-[13px] font-medium text-[var(--color-primary)] hover:underline"
								>
									{t('cart.browseCta')}
								</Link>
							</div>
						) : (
							<>
								<div className="flex-1 overflow-y-auto">
									{items.map((item) => {
										const noteOpen = expandedNotes.has(item.productId)
										return (
											<div key={item.productId} className="px-4 py-3 border-b border-[var(--color-divider)]">
												<div className="flex items-start gap-3">
													{item.imageUrl && (
														<Link to="/market/$productSlug" params={{ productSlug: item.slug }} onClick={() => setCartOpen(false)}>
															<img src={item.imageUrl} alt="" className="w-11 h-11 rounded-lg object-cover bg-[var(--color-surface)] shrink-0" />
														</Link>
													)}
													<div className="flex-1 min-w-0">
														<Link to="/market/$productSlug" params={{ productSlug: item.slug }} onClick={() => setCartOpen(false)} className="text-[13px] font-medium text-[var(--color-text)] line-clamp-1 hover:text-[var(--color-primary)] transition-colors block">
															{item.name}
														</Link>
														<p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
															{t(`categories.${item.category}`)} · {t(`units.${item.unitOfMeasure}`, item.unitOfMeasure)}
														</p>
													</div>
													<button type="button" onClick={() => remove(item.productId)} className="p-1 text-[var(--color-text-subtle)] hover:text-[var(--color-error)] shrink-0 transition-colors">
														<Trash2 size={13} />
													</button>
												</div>

												{/* Quantity + actions row */}
												<div className="flex items-center gap-2 mt-2 ms-14">
													<div className="flex items-center border border-[var(--color-border)] rounded-lg overflow-hidden">
														<button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors">
															<Minus size={11} />
														</button>
														<input
															type="number"
															value={item.quantity}
															onChange={(e) => {
																const v = parseInt(e.target.value, 10)
																if (!isNaN(v) && v >= 0) updateQuantity(item.productId, v)
															}}
															className="w-12 h-7 text-center font-mono text-[13px] bg-transparent border-x border-[var(--color-border)] outline-none text-[var(--color-text)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
															min={1}
														/>
														<button type="button" onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors">
															<Plus size={11} />
														</button>
													</div>

													<button
														type="button"
														onClick={() => duplicate(item.productId)}
														className="p-1.5 rounded text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors"
														title="Duplicate"
													>
														<Copy size={12} />
													</button>
													<button
														type="button"
														onClick={() => {
															const next = new Set(expandedNotes)
															if (next.has(item.productId)) next.delete(item.productId)
															else next.add(item.productId)
															setExpandedNotes(next)
														}}
														className={`p-1.5 rounded transition-colors ${item.note ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)]'} hover:bg-[var(--color-surface)]`}
														title="Add note"
													>
														<StickyNote size={12} />
													</button>
												</div>

												{/* Per-item note */}
												{noteOpen && (
													<div className="mt-2 ms-14">
														<input
															type="text"
															value={item.note}
															onChange={(e) => updateNote(item.productId, e.target.value)}
															placeholder="e.g. Grade 42.5N preferred"
															className="w-full h-7 px-2 rounded border border-[var(--color-border)] bg-transparent text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none focus:border-[var(--color-primary)] transition-colors"
														/>
													</div>
												)}
											</div>
										)
									})}
								</div>

								{/* Global note toggle */}
								<div className="border-t border-[var(--color-border)]">
									<button
										type="button"
										onClick={() => setShowGlobalNote(!showGlobalNote)}
										className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
									>
										<span className="flex items-center gap-1.5">
											<StickyNote size={12} />
											{t('cart.addNote')}
										</span>
										<ChevronDown size={12} className={`transition-transform ${showGlobalNote ? 'rotate-180' : ''}`} />
									</button>
									{showGlobalNote && (
										<div className="px-4 pb-3">
											<textarea
												value={globalNote}
												onChange={(e) => setGlobalNote(e.target.value)}
												placeholder="Delivery instructions, timeline, special requirements..."
												rows={2}
												className="w-full px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-transparent text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
											/>
										</div>
									)}
								</div>

								{/* Submit */}
								<div className="px-4 py-3 border-t border-[var(--color-border)]">
									<button
										type="button"
										onClick={() => { setCartOpen(false); openLoginModal('/portal/quote') }}
										className="w-full h-10 rounded-lg bg-[var(--color-primary)] text-white font-semibold text-[14px] hover:bg-[var(--color-primary-hover)] transition-colors"
									>
										{t('cart.submit')} — {items.length} {items.length === 1 ? 'item' : 'items'}
									</button>
									<p className="text-[11px] text-[var(--color-text-subtle)] text-center mt-2">
										{t('cart.submitHint')}
									</p>
								</div>
							</>
						)}
					</div>
				</>
			)}

			<MobileNavOverlay
				isOpen={mobileNavOpen}
				onClose={() => setMobileNavOpen(false)}
			/>
		</>
	)
}
