/**
 * RichMessage -- Dispatcher component for rich content in AI chat responses.
 *
 * Routes rich content types to their respective components with spring entrance animation.
 * Unknown types return null silently (forward-compatible with new types added in later phases).
 */
import { motion } from 'motion/react'
import type { RichContent } from '../../lib/chat-types'
import { ActionButton } from './ActionButton'
import { CommandPalette } from './CommandPalette'
import { DeliveryTrackingCard } from './DeliveryTrackingCard'
import { DraftCleanupResult } from './DraftCleanupResult'
import { MaterialList } from './MaterialList'
import { StatusCard } from './StatusCard'

interface RichMessageProps {
	type: string
	data: unknown
}

function RichMessage({ type, data }: RichMessageProps) {
	let content: React.ReactNode = null

	switch (type) {
		case 'status_card':
			content = (
				<StatusCard
					data={
						data as RichContent extends { type: 'status_card'; data: infer D }
							? D
							: never
					}
				/>
			)
			break
		case 'action_button':
			content = (
				<ActionButton
					data={
						data as RichContent extends { type: 'action_button'; data: infer D }
							? D
							: never
					}
				/>
			)
			break
		case 'command_palette':
			content = (
				<CommandPalette
					data={
						data as RichContent extends {
							type: 'command_palette'
							data: infer D
						}
							? D
							: never
					}
				/>
			)
			break
		case 'material_list':
			content = (
				<MaterialList
					data={
						data as RichContent extends { type: 'material_list'; data: infer D }
							? D
							: never
					}
				/>
			)
			break
		case 'delivery_tracking':
			content = (
				<DeliveryTrackingCard
					data={
						data as RichContent extends {
							type: 'delivery_tracking'
							data: infer D
						}
							? D
							: never
					}
				/>
			)
			break
		case 'draft_cleanup_result':
			content = (
				<DraftCleanupResult
					data={
						data as RichContent extends {
							type: 'draft_cleanup_result'
							data: infer D
						}
							? D
							: never
					}
				/>
			)
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
			{otherItems.map((item) => (
				<RichMessage
					key={`${item.type}-${JSON.stringify(item.data).slice(0, 64)}`}
					type={item.type}
					data={item.data}
				/>
			))}

			{actionButtons.length > 0 && (
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ type: 'spring', stiffness: 200, damping: 20 }}
					className="flex flex-wrap gap-2 mt-1"
				>
					{actionButtons.map((item) => (
						<ActionButton
							key={`action-${JSON.stringify(item.data).slice(0, 64)}`}
							data={item.data}
						/>
					))}
				</motion.div>
			)}
		</div>
	)
}
