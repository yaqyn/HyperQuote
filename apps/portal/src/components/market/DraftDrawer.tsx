import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import {
  ModalOverlay,
  Modal,
  Dialog,
  Button,
} from 'react-aria-components'
import { X, Minus, Plus, Trash2, ClipboardList } from 'lucide-react'
import { useDraftQuoteStore } from '../../stores/draft-quote'

interface DraftDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function DraftDrawer({ isOpen, onClose }: DraftDrawerProps) {
  const { t, i18n } = useTranslation('portal')
  const navigate = useNavigate()
  const isAr = i18n.language === 'ar'
  const items = useDraftQuoteStore((s) => s.items)
  const updateQuantity = useDraftQuoteStore((s) => s.updateQuantity)
  const remove = useDraftQuoteStore((s) => s.remove)
  const clear = useDraftQuoteStore((s) => s.clear)

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      isDismissable
      className="fixed inset-0 z-50 bg-black/40"
    >
      <Modal
        className={[
          'fixed inset-block-0 z-50 w-[380px] max-w-[90vw]',
          'bg-[var(--p-bg)] border-s border-[var(--p-border)]',
          'flex flex-col',
          'end-0',
        ].join(' ')}
      >
        <Dialog
          aria-label={t('market.draftQuote')}
          className="outline-none flex flex-col h-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--p-border)] shrink-0">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-[var(--p-text-muted)]" />
              <h2 className="text-[15px] font-semibold text-[var(--p-text)]">
                {t('market.draftQuote')}
              </h2>
              {items.length > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full bg-[var(--p-text)] text-white text-[13px] font-bold flex items-center justify-center px-1">
                  {items.length}
                </span>
              )}
            </div>
            <Button
              onPress={onClose}
              aria-label={t('window.close')}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--p-text-muted)] hover:text-[var(--p-text)] hover:bg-[var(--p-surface)] transition-colors cursor-pointer"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 px-5">
                <p className="text-[13px] text-[var(--p-text-muted)]">
                  {t('market.draftEmpty')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 px-5 py-3 border-b border-[var(--p-border)]"
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--p-surface)] shrink-0">
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--p-text)] line-clamp-1">
                        {isAr ? item.nameAr : item.name}
                      </p>
                      <p className="text-[13px] text-[var(--p-text-muted)]">
                        {item.unitOfMeasure}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-[var(--p-text-muted)] hover:bg-[var(--p-surface)] transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-mono text-[13px] w-6 text-center text-[var(--p-text)]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-[var(--p-text-muted)] hover:bg-[var(--p-surface)] transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => remove(item.productId)}
                      className="p-1 text-[var(--p-text-muted)] hover:text-[var(--p-error)] transition-colors shrink-0"
                      aria-label={t('market.removeItem')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="shrink-0 border-t border-[var(--p-border)] px-5 py-4 flex flex-col gap-2">
              <Button
                onPress={() => {
                  onClose()
                  navigate({ to: '/orders' })
                }}
                className="h-10 w-full rounded-lg bg-[var(--p-text)] text-white text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
              >
                {t('market.openInOrders')}
              </Button>
              <Button
                onPress={clear}
                className="h-8 w-full rounded-lg text-[13px] text-[var(--p-text-muted)] hover:text-[var(--p-error)] transition-colors cursor-pointer"
              >
                {t('market.clearDraft')}
              </Button>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
