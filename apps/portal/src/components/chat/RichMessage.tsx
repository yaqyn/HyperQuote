/**
 * RichMessage -- Dispatcher component for rich content in AI chat responses.
 *
 * Routes rich content types to their respective components with spring entrance animation.
 * Unknown types return null silently (forward-compatible with new types added in later phases).
 */
import { motion } from 'motion/react'
import type { RichContent } from '../../lib/chat-types'
import { ActionButton } from './ActionButton'
import { ClarificationSheet } from './ClarificationSheet'
import { CommandPalette } from './CommandPalette'
import { DeliveryTrackingCard } from './DeliveryTrackingCard'
import { DraftCleanupResult } from './DraftCleanupResult'
import { MaterialList } from './MaterialList'
import { ProductChoiceList } from './ProductChoiceList'
import { StatusCard } from './StatusCard'
import { SupportOptions } from './SupportOptions'

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
		case 'support_options':
			content = (
				<SupportOptions
					data={
						data as RichContent extends {
							type: 'support_options'
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
		case 'product_choice_list':
			content = (
				<ProductChoiceList
					data={
						data as RichContent extends {
							type: 'product_choice_list'
							data: infer D
						}
							? D
							: never
					}
				/>
			)
			break
		case 'clarification_sheet':
			content = (
				<ClarificationSheet
					data={
						data as RichContent extends {
							type: 'clarification_sheet'
							data: infer D
						}
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
			initial={{ opacity: 0, y: 6, scale: 0.99 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ type: 'spring', stiffness: 240, damping: 24 }}
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
		<div className="mt-2 flex flex-col gap-3">
			{otherItems.map((item) => (
				<RichMessage
					key={`${item.type}-${JSON.stringify(item.data).slice(0, 64)}`}
					type={item.type}
					data={item.data}
				/>
			))}

			{actionButtons.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 4 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ type: 'spring', stiffness: 240, damping: 24 }}
					className="mt-1 flex flex-wrap gap-2"
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
