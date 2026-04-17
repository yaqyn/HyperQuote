import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuoteCart } from '../../hooks/useQuoteCart'

export function QuoteCartPanel() {
	const { t } = useTranslation('website')
	const { items, updateQuantity, remove, clear } = useQuoteCart()

	if (items.length === 0) {
		return (
			<div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
				<div className="flex items-center gap-2 mb-4">
					<ShoppingCart size={18} className="text-[var(--color-text-muted)]" />
					<h3 className="text-[15px] font-semibold text-[var(--color-text)]">
						{t('cart.title')}
					</h3>
				</div>
				<p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed">
					{t('cart.empty')}
				</p>
			</div>
		)
	}

	return (
		<div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
				<div className="flex items-center gap-2">
					<ShoppingCart size={18} className="text-[var(--color-primary)]" />
					<h3 className="text-[15px] font-semibold text-[var(--color-text)]">
						{t('cart.title')}
					</h3>
					<span className="min-w-[20px] h-[20px] rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center px-1">
						{items.length}
					</span>
				</div>
				<button
					type="button"
					onClick={clear}
					className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors"
				>
					{t('cart.clearAll')}
				</button>
			</div>

			{/* Items */}
			<div className="max-h-[400px] overflow-y-auto">
				{items.map((item) => (
					<div
						key={item.productId}
						className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-divider)] last:border-b-0"
					>
						{/* Thumbnail */}
						{item.imageUrl && (
							<img
								src={item.imageUrl}
								alt=""
								className="w-10 h-10 rounded-lg object-cover bg-[var(--color-surface)] shrink-0"
							/>
						)}

						{/* Info */}
						<div className="flex-1 min-w-0">
							<p className="text-[13px] font-medium text-[var(--color-text)] line-clamp-1">
								{item.name}
							</p>
							<p className="text-[11px] text-[var(--color-text-muted)]">
								{t(`units.${item.unitOfMeasure}`, item.unitOfMeasure)}
							</p>
						</div>

						{/* Quantity controls */}
						<div className="flex items-center gap-1 shrink-0">
							<button
								type="button"
								onClick={() =>
									updateQuantity(item.productId, item.quantity - 1)
								}
								className="w-6 h-6 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors"
							>
								<Minus size={12} />
							</button>
							<span className="font-mono text-[13px] w-6 text-center text-[var(--color-text)]">
								{item.quantity}
							</span>
							<button
								type="button"
								onClick={() =>
									updateQuantity(item.productId, item.quantity + 1)
								}
								className="w-6 h-6 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors"
							>
								<Plus size={12} />
							</button>
						</div>

						{/* Remove */}
						<button
							type="button"
							onClick={() => remove(item.productId)}
							className="p-1 text-[var(--color-text-subtle)] hover:text-[var(--color-error)] transition-colors shrink-0"
							aria-label={t('cart.remove')}
						>
							<Trash2 size={14} />
						</button>
					</div>
				))}
			</div>

			{/* Submit CTA */}
			<div className="px-5 py-4 border-t border-[var(--color-border)]">
				<button
					type="button"
					onClick={() => console.log('Submit quote — Login Modal (Phase 6)')}
					className="w-full h-11 rounded-lg bg-[var(--color-primary)] text-white font-semibold text-[14px] hover:bg-[var(--color-primary-hover)] transition-colors"
				>
					{t('cart.submit')}
				</button>
			</div>
		</div>
	)
}
