import { useNavigate } from '@tanstack/react-router'
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Home,
	Printer,
	RefreshCw,
	Share2,
	Type,
} from 'lucide-react'
import { cubicBezier, motion, useReducedMotion } from 'motion/react'
import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'

type SubmenuPlacement = 'after' | 'before' | 'below' | 'above'

interface MenuState {
	x: number
	y: number
	targetElement: Element | null
	linkUrl: string | null
	linkLabel: string | null
	submenuPlacement: SubmenuPlacement
	submenuTop: number
	submenuInlineOffset: number
}

const MENU_WIDTH = 236
const MENU_HEIGHT = 204
const SUBMENU_WIDTH = 188
const SUBMENU_GAP = 2
const ROW_HEIGHT = 40
const DIVIDER_HEIGHT = 1
const HOME_ROW_OFFSET = ROW_HEIGHT * 4 + DIVIDER_HEIGHT
const VIEWPORT_MARGIN = 8
const MENU_EASE = cubicBezier(0.22, 1, 0.36, 1)

const PAGE_LINKS = [
	{ to: '/market', labelKey: 'nav.market' },
	{ to: '/support', labelKey: 'nav.support' },
	{ to: '/about', labelKey: 'nav.about' },
	{ to: '/careers', labelKey: 'footer.careers' },
	{ to: '/docs', labelKey: 'nav.docs' },
	{ to: '/login', labelKey: 'login.step1.heading' },
	{ to: '/legal/privacy', labelKey: 'footer.privacyPolicy' },
	{ to: '/legal/terms', labelKey: 'footer.termsOfUse' },
] as const

type PageTarget = '/' | (typeof PAGE_LINKS)[number]['to']

const SUBMENU_HEIGHT = PAGE_LINKS.length * ROW_HEIGHT + 2

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), Math.max(min, max))
}

function isFormControl(element: Element | null): boolean {
	return Boolean(
		element?.closest('input, textarea, select, [contenteditable="true"]'),
	)
}

function getSelectableElement(element: Element | null): HTMLElement {
	const readable = element?.closest(
		'p, li, blockquote, article, section, main, h1, h2, h3, h4',
	)
	if (readable instanceof HTMLElement) return readable
	return document.querySelector('main') ?? document.body
}

function getMenuPosition(clientX: number, clientY: number) {
	const viewportWidth = window.innerWidth
	const viewportHeight = window.innerHeight
	const maxX = viewportWidth - MENU_WIDTH - VIEWPORT_MARGIN
	const maxY = viewportHeight - MENU_HEIGHT - VIEWPORT_MARGIN
	const x = Math.max(VIEWPORT_MARGIN, Math.min(clientX, maxX))
	const y = Math.max(VIEWPORT_MARGIN, Math.min(clientY, maxY))
	const availableSubmenuHeight = Math.min(
		SUBMENU_HEIGHT,
		Math.max(ROW_HEIGHT, viewportHeight - VIEWPORT_MARGIN * 2),
	)
	const roomAfter = viewportWidth - (x + MENU_WIDTH) - VIEWPORT_MARGIN
	const roomBefore = x - VIEWPORT_MARGIN
	const roomBelow = viewportHeight - (y + MENU_HEIGHT) - VIEWPORT_MARGIN
	const roomAbove = y - VIEWPORT_MARGIN
	let submenuPlacement: SubmenuPlacement

	if (roomAfter >= SUBMENU_WIDTH + SUBMENU_GAP) {
		submenuPlacement = 'after'
	} else if (roomBefore >= SUBMENU_WIDTH + SUBMENU_GAP) {
		submenuPlacement = 'before'
	} else {
		submenuPlacement =
			roomBelow >= availableSubmenuHeight || roomBelow >= roomAbove
				? 'below'
				: 'above'
	}

	const minTop = VIEWPORT_MARGIN - y
	const maxTop = viewportHeight - VIEWPORT_MARGIN - availableSubmenuHeight - y
	const desiredTop =
		submenuPlacement === 'below'
			? MENU_HEIGHT + SUBMENU_GAP
			: submenuPlacement === 'above'
				? -availableSubmenuHeight - SUBMENU_GAP
				: HOME_ROW_OFFSET
	const submenuTop = clamp(desiredTop, minTop, maxTop)
	const submenuInlineOffset =
		submenuPlacement === 'below' || submenuPlacement === 'above'
			? clamp(
					0,
					VIEWPORT_MARGIN - x,
					viewportWidth - VIEWPORT_MARGIN - SUBMENU_WIDTH - x,
				)
			: 0

	return { x, y, submenuPlacement, submenuTop, submenuInlineOffset }
}

function getSubmenuStyle(menu: MenuState): CSSProperties {
	const base: CSSProperties = {
		top: menu.submenuTop,
		maxHeight: `calc(100dvh - ${VIEWPORT_MARGIN * 2}px)`,
	}

	if (menu.submenuPlacement === 'before') {
		return { ...base, insetInlineEnd: `calc(100% + ${SUBMENU_GAP}px)` }
	}
	if (menu.submenuPlacement === 'after') {
		return { ...base, insetInlineStart: `calc(100% + ${SUBMENU_GAP}px)` }
	}
	return { ...base, insetInlineStart: menu.submenuInlineOffset }
}

async function copyText(text: string) {
	try {
		await navigator.clipboard.writeText(text)
		return
	} catch {
		const textarea = document.createElement('textarea')
		textarea.value = text
		textarea.setAttribute('readonly', '')
		textarea.style.position = 'fixed'
		textarea.style.opacity = '0'
		document.body.appendChild(textarea)
		textarea.select()
		document.execCommand('copy')
		textarea.remove()
	}
}

export function SiteContextMenu() {
	const { t } = useTranslation('website')
	const navigate = useNavigate()
	const reduceMotion = useReducedMotion()
	const [menu, setMenu] = useState<MenuState | null>(null)
	const [pagesOpen, setPagesOpen] = useState(false)
	const pagesCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	function clearPagesCloseTimer() {
		if (!pagesCloseTimer.current) return
		clearTimeout(pagesCloseTimer.current)
		pagesCloseTimer.current = null
	}

	useEffect(() => {
		function handleContextMenu(event: MouseEvent) {
			const element =
				event.target instanceof Element ? event.target : document.body
			if (isFormControl(element)) return

			event.preventDefault()
			setPagesOpen(false)

			const anchor = element.closest('a')
			const { x, y, submenuPlacement, submenuTop, submenuInlineOffset } =
				getMenuPosition(event.clientX, event.clientY)

			setMenu({
				x,
				y,
				targetElement: element,
				linkUrl: anchor?.href ?? null,
				linkLabel: anchor?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
				submenuPlacement,
				submenuTop,
				submenuInlineOffset,
			})
		}

		function close() {
			setPagesOpen(false)
			setMenu(null)
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') close()
		}

		document.addEventListener('contextmenu', handleContextMenu)
		window.addEventListener('keydown', handleKeyDown)
		window.addEventListener('scroll', close, true)
		window.addEventListener('resize', close)
		return () => {
			document.removeEventListener('contextmenu', handleContextMenu)
			window.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('scroll', close, true)
			window.removeEventListener('resize', close)
		}
	}, [])

	useEffect(() => {
		return () => {
			if (!pagesCloseTimer.current) return
			clearTimeout(pagesCloseTimer.current)
		}
	}, [])

	if (!menu) return null
	const activeMenu = menu

	function close() {
		setPagesOpen(false)
		setMenu(null)
	}

	function openPagesMenu() {
		clearPagesCloseTimer()
		setPagesOpen(true)
	}

	function closePagesMenu() {
		clearPagesCloseTimer()
		setPagesOpen(false)
	}

	function queuePagesMenuClose() {
		clearPagesCloseTimer()
		pagesCloseTimer.current = setTimeout(() => {
			setPagesOpen(false)
			pagesCloseTimer.current = null
		}, 120)
	}

	function refresh() {
		close()
		window.location.reload()
	}

	function selectText() {
		const selection = window.getSelection()
		const range = document.createRange()
		range.selectNodeContents(getSelectableElement(activeMenu.targetElement))
		selection?.removeAllRanges()
		selection?.addRange(range)
		close()
	}

	async function share() {
		const url = activeMenu.linkUrl ?? window.location.href
		const title = activeMenu.linkLabel || document.title

		if (navigator.share) {
			try {
				await navigator.share({ title, url })
			} catch {
				// User cancelled the native share sheet.
			}
		} else {
			await copyText(url)
		}
		close()
	}

	function printPage() {
		close()
		window.print()
	}

	function go(to: PageTarget) {
		close()
		navigate({ to })
	}

	const submenuStyle = getSubmenuStyle(activeMenu)

	return (
		<>
			<button
				type="button"
				aria-label={t('a11y.close')}
				className="fixed inset-0 z-[79] cursor-default bg-transparent"
				onClick={close}
			/>
			<motion.div
				role="menu"
				aria-label={t('contextMenu.label')}
				className="fixed z-[80] w-[236px] overflow-visible text-[13px]"
				initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{ duration: 0.16, ease: MENU_EASE }}
				style={{ left: activeMenu.x, top: activeMenu.y }}
				onPointerLeave={queuePagesMenuClose}
			>
				<div className="overflow-hidden rounded-xl border border-[var(--color-text)]/[0.08] bg-[var(--color-base)]/95 shadow-[0_18px_46px_rgba(0,0,0,0.14),0_2px_12px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:shadow-[0_24px_70px_rgba(0,0,0,0.52)]">
					<ContextMenuItem
						icon={<RefreshCw size={15} />}
						onClick={refresh}
						onPointerEnter={closePagesMenu}
					>
						{t('contextMenu.refresh')}
					</ContextMenuItem>
					<ContextMenuItem
						icon={<Type size={15} />}
						onClick={selectText}
						onPointerEnter={closePagesMenu}
					>
						{t('contextMenu.selectText')}
					</ContextMenuItem>
					<ContextMenuItem
						icon={<Share2 size={15} />}
						onClick={share}
						onPointerEnter={closePagesMenu}
					>
						{activeMenu.linkUrl
							? t('contextMenu.shareUrl')
							: t('contextMenu.sharePage')}
					</ContextMenuItem>
					<ContextMenuItem
						icon={<Printer size={15} />}
						onClick={printPage}
						onPointerEnter={closePagesMenu}
					>
						{t('contextMenu.print')}
					</ContextMenuItem>

					<div className="h-px bg-[var(--color-text)]/[0.08]" />

					<ContextMenuItem
						icon={<Home size={15} />}
						endIcon={<SubmenuChevron placement={activeMenu.submenuPlacement} />}
						onClick={() => go('/')}
						onPointerEnter={openPagesMenu}
						onFocus={openPagesMenu}
					>
						{t('contextMenu.home')}
					</ContextMenuItem>
				</div>

				<div
					role="menu"
					aria-label={t('contextMenu.pages')}
					className={`absolute z-10 w-[188px] overflow-y-auto overscroll-contain rounded-xl border border-[var(--color-text)]/[0.08] bg-[var(--color-base)]/95 shadow-[0_18px_46px_rgba(0,0,0,0.14),0_2px_12px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-[opacity,transform,visibility] duration-150 ease-out dark:shadow-[0_24px_70px_rgba(0,0,0,0.52)] ${
						pagesOpen
							? 'visible translate-y-0 scale-100 opacity-100'
							: 'invisible translate-y-1 scale-[0.985] opacity-0'
					}`}
					style={submenuStyle}
					onPointerEnter={openPagesMenu}
				>
					{PAGE_LINKS.map((page) => (
						<button
							key={page.to}
							type="button"
							role="menuitem"
							onClick={() => go(page.to)}
							className="flex min-h-10 w-full items-center border-s-2 border-transparent px-3.5 text-start text-[13px] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/[0.055] hover:text-[var(--color-text)] focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--color-primary)]/[0.055] focus-visible:text-[var(--color-text)] focus-visible:outline-none"
						>
							{t(page.labelKey)}
						</button>
					))}
				</div>
			</motion.div>
		</>
	)
}

function SubmenuChevron({ placement }: { placement: SubmenuPlacement }) {
	const Icon =
		placement === 'before'
			? ChevronLeft
			: placement === 'below'
				? ChevronDown
				: placement === 'above'
					? ChevronUp
					: ChevronRight

	return (
		<Icon
			size={14}
			className="icon-end opacity-45 transition-opacity group-hover:opacity-100"
		/>
	)
}

function ContextMenuItem({
	icon,
	children,
	endIcon,
	onClick,
	onFocus,
	onPointerEnter,
}: {
	icon: ReactNode
	children: ReactNode
	endIcon?: ReactNode
	onClick: () => void
	onFocus?: () => void
	onPointerEnter?: () => void
}) {
	return (
		<button
			type="button"
			role="menuitem"
			onClick={onClick}
			onFocus={onFocus}
			onPointerEnter={onPointerEnter}
			className="group flex min-h-10 w-full items-center gap-2.5 border-s-2 border-transparent px-3.5 text-start text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/[0.055] hover:text-[var(--color-text)] focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--color-primary)]/[0.055] focus-visible:text-[var(--color-text)] focus-visible:outline-none"
		>
			<span className="shrink-0 text-[var(--color-primary)] opacity-50 transition-opacity group-hover:opacity-80">
				{icon}
			</span>
			<span className="min-w-0 flex-1 truncate">{children}</span>
			{endIcon ? (
				<span className="shrink-0 text-[var(--color-primary)]">{endIcon}</span>
			) : null}
		</button>
	)
}
