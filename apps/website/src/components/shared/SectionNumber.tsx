import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

interface SectionNumberProps {
  n: number | string
}

/**
 * Watermark-style section number.
 * Black at 10% opacity by default, animates to brand blue when it crosses the viewport center.
 */
export function SectionNumber({ n }: SectionNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isActive = useInView(ref, {
    margin: '0px 0px -50% 0px',
  })

  return (
    <motion.span
      ref={ref}
      animate={{
        color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
        opacity: isActive ? 1 : 0.1,
      }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="block font-[family-name:var(--font-mono)] text-[clamp(1.4rem,3vw,2rem)] leading-none"
    >
      {typeof n === 'number' ? String(n).padStart(2, '0') : n}
    </motion.span>
  )
}
