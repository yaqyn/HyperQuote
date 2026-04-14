import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Undo2 } from 'lucide-react'
import { useDraftQuoteStore } from '../../stores/draft-quote'
import type { MarketProduct } from '../../lib/server/market'

const PLACEHOLDER_IMAGE =
  'https://websiteassets.hyperquote.net/Images/cairo.webp'

function AddPopover({
  product,
  onClose,
  anchorRef,
}: {
  product: MarketProduct
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}) {
  const { t, i18n } = useTranslation('portal')
  const isAr = i18n.language === 'ar'
  const { add, remove, updateQuantity, items } = useDraftQuoteStore()
  const existingItem = items.find((i) => i.productId === product.id)
  const [qtyStr, setQtyStr] = useState(String(existingItem?.quantity ?? 1))
  const qty = parseInt(qtyStr, 10) || 0
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose, anchorRef])

  const handleSubmit = () => {
    if (qty > 0) {
      if (existingItem) {
        updateQuantity(product.id, qty)
      } else {
        add(
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            nameAr: product.nameAr,
            category: product.category,
            unitOfMeasure: product.unitOfMeasure,
            imageUrl: product.imageUrl,
          },
          qty,
        )
      }
      onClose()
    }
  }

  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({
      top: rect.top - 12,
      left: Math.max(8, rect.right - 208),
    })
  }, [anchorRef])

  return createPortal(
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ position: 'fixed', bottom: `calc(100vh - ${pos.top}px + 12px)`, left: pos.left }}
      className="z-[100] w-52 backdrop-blur-xl bg-black/60 border border-white/15 rounded-xl shadow-2xl p-3"
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <p className="text-[13px] font-medium text-white line-clamp-1 mb-2">
        {isAr ? product.nameAr : product.name}
      </p>

      <div className="relative mb-2">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={qtyStr}
          onChange={(e) => setQtyStr(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') {
              e.preventDefault()
              if (qty <= 0) { remove(product.id); onClose() }
              else handleSubmit()
            }
            if (e.key === 'Escape') onClose()
          }}
          min={1}
          className="w-full h-8 rounded-lg border border-white/15 bg-white/10 ps-2.5 pe-12 font-mono text-[14px] text-white outline-none focus:border-white/40 transition-colors text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[13px] text-white/40 pointer-events-none">
          {product.unitOfMeasure}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {existingItem && (
          <button
            type="button"
            onClick={() => { remove(product.id); onClose() }}
            className="w-8 h-8 shrink-0 rounded-lg border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Undo2 size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 h-8 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-colors"
        >
          {existingItem ? t('market.confirm') : t('market.addToQuote')}
        </button>
      </div>
    </motion.div>,
    document.body,
  )
}

interface MarketProductCardProps {
  product: MarketProduct
  onNavigate: () => void
}

export function MarketProductCard({ product, onNavigate }: MarketProductCardProps) {
  const { t, i18n } = useTranslation('portal')
  const isAr = i18n.language === 'ar'
  const name = isAr ? product.nameAr : product.name
  const image = product.imageUrl || PLACEHOLDER_IMAGE
  const { items } = useDraftQuoteStore()
  const inDraft = items.some((i) => i.productId === product.id)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleBtnClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPopoverOpen(!popoverOpen)
  }

  return (
    <div
      className="group block cursor-pointer"
      onClick={onNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onNavigate()
        }
      }}
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-[var(--p-surface)]">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
          loading="lazy"
        />
        <button
          ref={btnRef}
          type="button"
          onClick={handleBtnClick}
          className={`absolute bottom-3 end-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ring-1 shadow-lg ${
            inDraft
              ? 'backdrop-blur-md bg-white ring-white/40'
              : 'backdrop-blur-xl bg-black/20 ring-white/10 opacity-0 group-hover:opacity-100 max-lg:opacity-100 hover:bg-black/35'
          }`}
          aria-label={inDraft ? t('market.editQuantity') : t('market.addToQuote')}
        >
          {inDraft ? <Pencil size={14} className="text-black" /> : <Plus size={16} className="text-white" />}
        </button>
      </div>
      <AnimatePresence>
        {popoverOpen && (
          <AddPopover product={product} onClose={() => setPopoverOpen(false)} anchorRef={btnRef} />
        )}
      </AnimatePresence>
      <div className="mt-3 px-0.5">
        <h3 className="text-[15px] font-medium text-[var(--p-text)] line-clamp-2 leading-snug">
          {name}
        </h3>
        <p className="text-[13px] text-[var(--p-text-muted)] mt-1">
          {t(`market.cat.${product.category}`, { defaultValue: product.category.replace(/_/g, ' ') })} · {product.unitOfMeasure}
        </p>
      </div>
    </div>
  )
}
