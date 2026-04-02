import { useRef } from 'react'
import { useInView } from 'motion/react'

interface SectionNumberProps {
  n: number | string
}

/**
 * Watermark-style section number.
 * Black at 10% opacity by default, turns brand blue when it crosses the viewport center.
 */
export function SectionNumber({ n }: SectionNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isActive = useInView(ref, {
    margin: '0px 0px -50% 0px', // triggers when element passes center of viewport
  })

  return (
    <span
      ref={ref}
      className={`block font-[family-name:var(--font-mono)] text-[clamp(1.4rem,3vw,2rem)] leading-none transition-colors duration-300 ${
        isActive
          ? 'text-[var(--color-primary)]'
          : 'text-[var(--color-text)] opacity-10'
      }`}
    >
      {typeof n === 'number' ? String(n).padStart(2, '0') : n}
    </span>
  )
}
