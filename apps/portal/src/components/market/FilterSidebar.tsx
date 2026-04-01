import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ListBox,
  ListBoxItem,
  Modal,
  ModalOverlay,
  Dialog,
  Button,
  Switch,
  ToggleButton,
} from 'react-aria-components'
import { SlidersHorizontal, Heart, X } from 'lucide-react'

interface FilterSidebarProps {
  selectedCategory: string | null
  onCategoryChange: (category: string | null) => void
  showFavoritesOnly: boolean
  onFavoritesToggle: (show: boolean) => void
  isMobile: boolean
}

const CATEGORIES = [
  { id: 'all', labelEn: 'All', labelAr: '\u0627\u0644\u0643\u0644' },
  { id: 'cement', labelEn: 'Cement', labelAr: '\u0627\u0633\u0645\u0646\u062a' },
  { id: 'reinforcing_steel', labelEn: 'Reinforcing Steel', labelAr: '\u062d\u062f\u064a\u062f \u062a\u0633\u0644\u064a\u062d' },
  { id: 'sand', labelEn: 'Sand', labelAr: '\u0631\u0645\u0644' },
  { id: 'aggregates', labelEn: 'Aggregates', labelAr: '\u0631\u0643\u0627\u0645' },
  { id: 'bricks', labelEn: 'Bricks & Blocks', labelAr: '\u0637\u0648\u0628 \u0648\u0628\u0644\u0648\u0643' },
  { id: 'wood', labelEn: 'Wood & Plywood', labelAr: '\u062e\u0634\u0628 \u0648\u0623\u0628\u0644\u0643\u0627\u0634' },
  { id: 'paints', labelEn: 'Paints', labelAr: '\u062f\u0647\u0627\u0646\u0627\u062a' },
  { id: 'waterproofing', labelEn: 'Waterproofing', labelAr: '\u0639\u0632\u0644' },
  { id: 'plumbing', labelEn: 'Plumbing', labelAr: '\u0633\u0628\u0627\u0643\u0629' },
  { id: 'electrical', labelEn: 'Electrical', labelAr: '\u0643\u0647\u0631\u0628\u0627\u0621' },
  { id: 'tiles', labelEn: 'Tiles', labelAr: '\u0628\u0644\u0627\u0637' },
  { id: 'insulation', labelEn: 'Insulation', labelAr: '\u0639\u0632\u0644 \u062d\u0631\u0627\u0631\u064a' },
  { id: 'concrete', labelEn: 'Ready Mix', labelAr: '\u062e\u0631\u0633\u0627\u0646\u0629 \u062c\u0627\u0647\u0632\u0629' },
  { id: 'drywall', labelEn: 'Drywall', labelAr: '\u062c\u0628\u0633 \u0628\u0648\u0631\u062f' },
  { id: 'adhesives', labelEn: 'Adhesives', labelAr: '\u0644\u0648\u0627\u0635\u0642' },
  { id: 'structural_steel', labelEn: 'Structural Steel', labelAr: '\u062d\u062f\u064a\u062f \u0625\u0646\u0634\u0627\u0626\u064a' },
]

function FilterContent({
  selectedCategory,
  onCategoryChange,
  showFavoritesOnly,
  onFavoritesToggle,
  isAr,
  t,
}: {
  selectedCategory: string | null
  onCategoryChange: (category: string | null) => void
  showFavoritesOnly: boolean
  onFavoritesToggle: (show: boolean) => void
  isAr: boolean
  t: (key: string, fallback?: string) => string
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Favorites filter */}
      <ToggleButton
        isSelected={showFavoritesOnly}
        onChange={onFavoritesToggle}
        className={({ isSelected }) => [
          'flex items-center gap-2 px-3 py-2 rounded-full text-sm cursor-pointer',
          'transition-colors duration-150',
          isSelected
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]',
        ].join(' ')}
      >
        <Heart size={14} />
        {t('market.favorites')}
      </ToggleButton>

      {/* Categories */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          {t('market.categories', 'Categories')}
        </h3>
        <ListBox
          aria-label={t('market.categories', 'Categories')}
          selectionMode="single"
          selectedKeys={new Set([selectedCategory ?? 'all'])}
          onSelectionChange={(keys) => {
            const selected = [...keys][0] as string
            onCategoryChange(selected === 'all' ? null : selected)
          }}
          className="flex flex-col gap-0.5"
        >
          {CATEGORIES.map((cat) => (
            <ListBoxItem
              key={cat.id}
              id={cat.id}
              textValue={isAr ? cat.labelAr : cat.labelEn}
              className={({ isSelected }) => [
                'px-3 py-2 rounded-lg text-sm cursor-pointer outline-none',
                'transition-colors duration-150',
                isSelected
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-surface)]',
              ].join(' ')}
            >
              {isAr ? cat.labelAr : cat.labelEn}
            </ListBoxItem>
          ))}
        </ListBox>
      </div>

      {/* Availability toggle */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          {t('market.availability', 'Availability')}
        </h3>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[var(--color-text)]">
            {t('market.inStockOnly', 'In stock only')}
          </span>
          <Switch className="group inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-[var(--color-surface)] transition-colors duration-200 data-[selected]:bg-[var(--color-primary)]">
            <span className="block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 translate-x-0 group-data-[selected]:translate-x-4" />
          </Switch>
        </div>
      </div>
    </div>
  )
}

export function FilterSidebar({
  selectedCategory,
  onCategoryChange,
  showFavoritesOnly,
  onFavoritesToggle,
  isMobile,
}: FilterSidebarProps) {
  const { t, i18n } = useTranslation('portal')
  const isAr = i18n.language === 'ar'
  const [isOpen, setIsOpen] = useState(false)

  const filterProps = {
    selectedCategory,
    onCategoryChange,
    showFavoritesOnly,
    onFavoritesToggle,
    isAr,
    t,
  }

  // Desktop: inline sidebar
  if (!isMobile) {
    return (
      <aside className="w-56 shrink-0 border-e border-[var(--color-border)] pe-4 overflow-y-auto">
        <FilterContent {...filterProps} />
      </aside>
    )
  }

  // Mobile: button + bottom sheet modal
  return (
    <>
      <Button
        onPress={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-surface)] transition-colors cursor-pointer"
      >
        <SlidersHorizontal size={14} />
        {t('market.filters', 'Filters')}
      </Button>

      <ModalOverlay
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        isDismissable
        className="fixed inset-0 z-50 bg-black/20"
      >
        <Modal
          className={[
            'fixed bottom-0 inset-x-0 z-50',
            'bg-[var(--color-card)] rounded-t-2xl shadow-2xl',
            'max-h-[70vh] overflow-y-auto',
            'animate-slide-up',
          ].join(' ')}
        >
          <Dialog
            aria-label={t('market.filters', 'Filters')}
            className="outline-none p-6"
          >
            {/* Drag handle */}
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-[var(--color-text)]">
                {t('market.filters', 'Filters')}
              </h2>
              <Button
                onPress={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X size={18} />
              </Button>
            </div>

            <FilterContent
              {...filterProps}
              onCategoryChange={(cat) => {
                onCategoryChange(cat)
                setIsOpen(false)
              }}
            />
          </Dialog>
        </Modal>
      </ModalOverlay>

      {/* Bottom sheet slide-up animation */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 200ms ease-out;
        }
      `}</style>
    </>
  )
}
