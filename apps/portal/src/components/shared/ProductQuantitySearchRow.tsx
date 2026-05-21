import { Check, Package, Plus, X } from 'lucide-react'
import {
	AnimatePresence,
	cubicBezier,
	motion,
	useReducedMotion,
} from 'motion/react'
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'

export type ProductQuantitySearchRowProduct = {
	id: string
	name: string
	nameAr: string
	category: string
	categoryName: string
	categoryNameAr: string
	unitOfMeasure: string
	unitOfMeasureAr: string
	imageUrl: string
}

type ProductQuantitySearchRowProps = {
	product: ProductQuantitySearchRowProduct
	isAr: boolean
	quantity: number
	editing: boolean
	onOpenEditor: () => void
	onCancelEditor: () => void
	onSetQuantity: (quantity: number) => void
	size?: 'compact' | 'comfortable'
}

const ROW_EASE = cubicBezier(0.22, 1, 0.36, 1)

export function ProductQuantitySearchRow({
	product,
	isAr,
	quantity,
	editing,
	onOpenEditor,
	onCancelEditor,
	onSetQuantity,
	size = 'compact',
}: ProductQuantitySearchRowProps) {
	const { t } = useTranslation('portal')
	const shouldReduceMotion = useReducedMotion()
	const [draftQuantity, setDraftQuantity] = useState(
		quantity > 0 ? String(quantity) : '0',
	)
	const quantityInputRef = useRef<HTMLInputElement | null>(null)
	const comfortable = size === 'comfortable'
	const name = isAr ? product.nameAr : product.name
	const categoryLabel =
		isAr && product.categoryNameAr
			? product.categoryNameAr
			: product.categoryName
	const unitLabel =
		isAr && product.unitOfMeasureAr
			? product.unitOfMeasureAr
			: product.unitOfMeasure
	const focusQuantityInput = useCallback((input: HTMLInputElement | null) => {
		if (!input) return
		input.focus({ preventScroll: true })
		input.select()
	}, [])
	const setQuantityInputRef = useCallback(
		(input: HTMLInputElement | null) => {
			quantityInputRef.current = input
			if (!input || !editing) return
			focusQuantityInput(input)
			requestAnimationFrame(() => focusQuantityInput(input))
			window.setTimeout(() => focusQuantityInput(input), 80)
		},
		[editing, focusQuantityInput],
	)

	useEffect(() => {
		if (editing) return
		setDraftQuantity(quantity > 0 ? String(quantity) : '0')
	}, [editing, quantity])

	useLayoutEffect(() => {
		if (!editing) return
		focusQuantityInput(quantityInputRef.current)
		const frame = requestAnimationFrame(() => {
			focusQuantityInput(quantityInputRef.current)
		})
		return () => cancelAnimationFrame(frame)
	}, [editing, focusQuantityInput])

	function openQuantityEditor() {
		setDraftQuantity(quantity > 0 ? String(quantity) : '0')
		onOpenEditor()
	}

	function commitQuantity() {
		const next = Number.parseInt(draftQuantity.trim(), 10)
		if (Number.isNaN(next) || next < 1) {
			onCancelEditor()
			return
		}
		onSetQuantity(next)
		onCancelEditor()
	}

	const validQuantity = Number.parseInt(draftQuantity.trim(), 10) > 0
	const formattedQuantity = quantity.toLocaleString(isAr ? 'ar-EG' : 'en-EG')

	const imageSize = comfortable ? 'h-12 w-12' : 'h-11 w-11'

	return (
		<motion.div
			initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 4 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
			transition={{
				duration: shouldReduceMotion ? 0.01 : 0.14,
				ease: ROW_EASE,
			}}
			className={[
				'flex min-w-0 items-center gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-colors hover:border-[var(--p-border-strong)]',
				comfortable ? 'p-3' : 'p-2.5',
			].join(' ')}
		>
			{product.imageUrl ? (
				<img
					src={product.imageUrl}
					alt=""
					loading="lazy"
					decoding="async"
					className={[
						'shrink-0 rounded-lg bg-[var(--p-surface)] object-cover ring-1 ring-inset ring-[var(--p-border)]',
						imageSize,
					].join(' ')}
				/>
			) : (
				<div
					aria-hidden="true"
					className={[
						'flex shrink-0 items-center justify-center rounded-lg bg-[var(--p-surface)] text-[var(--p-text-faint)] ring-1 ring-inset ring-[var(--p-border)]',
						imageSize,
					].join(' ')}
				>
					<Package size={comfortable ? 18 : 16} />
				</div>
			)}
			<div className="min-w-0 flex-1">
				<p
					className={[
						'truncate font-medium text-[var(--p-text)]',
						comfortable ? 'text-[14px]' : 'text-[13px]',
					].join(' ')}
				>
					{name}
				</p>
				<p className="mt-1 truncate text-[12px] text-[var(--p-text-muted)]">
					{categoryLabel} · {unitLabel}
				</p>
			</div>
			<div
				className={[
					'flex shrink-0 justify-end',
					comfortable ? 'w-[124px]' : 'w-[112px]',
				].join(' ')}
			>
				<AnimatePresence mode="wait" initial={false}>
					{editing ? (
						<motion.form
							key="quantity-input"
							onSubmit={(event) => {
								event.preventDefault()
								commitQuantity()
							}}
							onBlur={(event) => {
								const nextFocus = event.relatedTarget
								if (
									nextFocus instanceof Node &&
									event.currentTarget.contains(nextFocus)
								) {
									return
								}
								onCancelEditor()
							}}
							initial={{
								opacity: 0,
								scale: shouldReduceMotion ? 1 : 0.96,
								x: shouldReduceMotion ? 0 : 8,
							}}
							animate={{ opacity: 1, scale: 1, x: 0 }}
							exit={{
								opacity: 0,
								scale: shouldReduceMotion ? 1 : 0.96,
								x: shouldReduceMotion ? 0 : 8,
							}}
							transition={{
								duration: shouldReduceMotion ? 0.01 : 0.16,
								ease: ROW_EASE,
							}}
							className={[
								'flex items-center overflow-hidden rounded-xl border border-[var(--p-border-strong)] bg-[var(--p-bg)] shadow-[0_8px_24px_rgba(37,99,235,0.12)]',
								comfortable ? 'h-11' : 'h-10',
							].join(' ')}
						>
							<input
								ref={setQuantityInputRef}
								type="text"
								inputMode="numeric"
								pattern="[0-9]*"
								value={draftQuantity}
								onChange={(event) =>
									setDraftQuantity(event.currentTarget.value.replace(/\D/g, ''))
								}
								onFocus={(event) => event.currentTarget.select()}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault()
										commitQuantity()
									}
									if (event.key === 'Escape') {
										event.preventDefault()
										onCancelEditor()
									}
								}}
								className={[
									'h-full bg-transparent px-2 text-center font-mono font-semibold text-[var(--p-text)] outline-none [appearance:textfield] placeholder:text-[var(--p-text-faint)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
									comfortable ? 'w-[78px] text-[15px]' : 'w-[72px] text-[14px]',
								].join(' ')}
								style={{ fontVariantNumeric: 'tabular-nums' }}
								aria-label={t('market.quantity')}
							/>
							<motion.button
								type="submit"
								className={[
									'flex h-full items-center justify-center bg-[var(--p-accent)] text-[var(--p-accent-contrast)]',
									comfortable ? 'w-11' : 'w-10',
								].join(' ')}
								aria-label={
									validQuantity ? t('market.addToQuote') : t('market.closeCart')
								}
								whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
							>
								{validQuantity ? (
									<Check size={15} strokeWidth={2} />
								) : (
									<X size={15} strokeWidth={2} />
								)}
							</motion.button>
						</motion.form>
					) : (
						<motion.button
							key="quantity-button"
							type="button"
							onClick={openQuantityEditor}
							className={[
								'flex items-center justify-center rounded-xl bg-[var(--p-accent)] px-2 text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90',
								comfortable ? 'h-11 min-w-11' : 'h-10 min-w-10',
							].join(' ')}
							aria-label={t('market.addToQuote')}
							initial={{
								opacity: 0,
								scale: shouldReduceMotion ? 1 : 0.96,
								x: shouldReduceMotion ? 0 : -8,
							}}
							animate={{ opacity: 1, scale: 1, x: 0 }}
							exit={{
								opacity: 0,
								scale: shouldReduceMotion ? 1 : 0.96,
								x: shouldReduceMotion ? 0 : -8,
							}}
							transition={{
								duration: shouldReduceMotion ? 0.01 : 0.14,
								ease: ROW_EASE,
							}}
							whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
						>
							{quantity > 0 ? (
								<span
									className="font-mono text-[12px] font-semibold"
									style={{ fontVariantNumeric: 'tabular-nums' }}
								>
									{formattedQuantity}
								</span>
							) : (
								<Plus size={16} strokeWidth={1.9} />
							)}
						</motion.button>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	)
}
