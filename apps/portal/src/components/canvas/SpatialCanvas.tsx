import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { useMatches, useNavigate } from '@tanstack/react-router'

const WINDOW_ROUTES = [
  '/orders',
  '/market',
  '/notifications',
  '/documents',
  '/support',
  '/settings',
  '/supplier/stock',
  '/supplier/orders',
]

interface SpatialCanvasProps {
  children: ReactNode
}

export function SpatialCanvas({ children }: SpatialCanvasProps) {
  const matches = useMatches()
  const navigate = useNavigate()

  const isWindowOpen = matches.some((m) =>
    WINDOW_ROUTES.some((p) => m.pathname.startsWith(p)),
  )

  const handleCanvasClick = () => {
    if (isWindowOpen) {
      navigate({ to: '/' })
    }
  }

  return (
    <motion.div
      animate={
        isWindowOpen
          ? { scale: 0.96, filter: 'blur(2px)', opacity: 0.5 }
          : { scale: 1, filter: 'blur(0px)', opacity: 1 }
      }
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      onClick={handleCanvasClick}
      className="h-dvh w-full flex flex-col items-center pt-[35vh] bg-[var(--color-base)]"
    >
      {children}
    </motion.div>
  )
}
