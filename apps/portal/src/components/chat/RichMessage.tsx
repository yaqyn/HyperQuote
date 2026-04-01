/**
 * RichMessage -- Dispatcher component for rich content in AI chat responses.
 *
 * Routes rich content types to their respective components with spring entrance animation.
 * Unknown types return null silently (forward-compatible with new types added in later phases).
 */
import { motion } from 'motion/react'
import type { RichContent } from '../../lib/chat-types'
import { ProductCard } from './ProductCard'
import { StatusCard } from './StatusCard'
import { ActionButton } from './ActionButton'

interface RichMessageProps {
  type: string
  data: unknown
}

export function RichMessage({ type, data }: RichMessageProps) {
  let content: React.ReactNode = null

  switch (type) {
    case 'product_card':
      content = <ProductCard data={data as RichContent extends { type: 'product_card'; data: infer D } ? D : never} />
      break
    case 'status_card':
      content = <StatusCard data={data as RichContent extends { type: 'status_card'; data: infer D } ? D : never} />
      break
    case 'action_button':
      content = <ActionButton data={data as RichContent extends { type: 'action_button'; data: infer D } ? D : never} />
      break
    default:
      return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {content}
    </motion.div>
  )
}

/**
 * RichMessageList -- Renders multiple rich content items in a vertical stack.
 */
interface RichMessageListProps {
  items: RichContent[]
}

export function RichMessageList({ items }: RichMessageListProps) {
  if (!items || items.length === 0) return null

  // Group action buttons into a horizontal row
  const actionButtons = items.filter((item) => item.type === 'action_button')
  const otherItems = items.filter((item) => item.type !== 'action_button')

  return (
    <div className="flex flex-col gap-2 mt-2">
      {otherItems.map((item, idx) => (
        <RichMessage key={idx} type={item.type} data={item.data} />
      ))}

      {actionButtons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex flex-wrap gap-2 mt-1"
        >
          {actionButtons.map((item, idx) => (
            <ActionButton key={idx} data={item.data} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
