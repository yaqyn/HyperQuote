import { useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const FALLBACK_IMAGE =
  'https://websiteassets.hyperquote.net/Images/cairo.webp'

interface ImageGalleryProps {
  imageUrls: string[] | null
  productName: string
}

export function ImageGallery({ imageUrls, productName }: ImageGalleryProps) {
  const { t } = useTranslation('website')
  const images = imageUrls?.length ? imageUrls : [FALLBACK_IMAGE]
  const [activeIndex, setActiveIndex] = useState(0)
  const [overlayOpen, setOverlayOpen] = useState(false)

  return (
    <>
      {/* Primary image */}
      <div className="group aspect-square overflow-hidden rounded-xl bg-[var(--color-surface)]">
        <img
          src={images[activeIndex]}
          alt={productName}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-150"
          loading="eager"
          onClick={() => setOverlayOpen(true)}
        />
      </div>

      {/* Thumbnail gallery (only if more than 1 image) */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`h-16 w-16 overflow-hidden rounded border-2 transition-colors ${
                i === activeIndex
                  ? 'border-[var(--color-primary)]'
                  : 'border-transparent'
              }`}
            >
              <img
                src={url}
                alt={`${productName} ${i + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Mobile full-screen overlay */}
      {overlayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 lg:hidden">
          <button
            type="button"
            onClick={() => setOverlayOpen(false)}
            className="absolute top-4 end-4 z-10 rounded-full bg-white/20 p-2 text-white"
            aria-label={t('a11y.close')}
          >
            <X size={24} />
          </button>
          <img
            src={images[activeIndex]}
            alt={productName}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        </div>
      )}
    </>
  )
}
