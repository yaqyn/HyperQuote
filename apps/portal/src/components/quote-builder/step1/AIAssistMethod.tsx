/**
 * AI Assist input method for quote builder Step 1.
 * Natural language textarea -> parseWithAI server function -> structured items.
 * Items with matchConfidence < 0.8 flagged as unmatched with yellow badge.
 * Mock implementation; Phase 30 swaps with real AI.
 */

import { Sparkles } from 'lucide-react'
import { animate } from 'motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Text, TextArea } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import {
	type ParsedItem,
	parseWithAI,
} from '../../../lib/server/quote-requests'
import {
	type QuoteItem,
	useQuoteBuilderStore,
} from '../../../stores/quote-builder'

// ============================================================================
// Confidence threshold
// ============================================================================

const MATCH_CONFIDENCE_THRESHOLD = 0.8

// ============================================================================
// Parsed item display with tween animation
// ============================================================================

function ParsedItemRow({
	item,
	index,
}: {
	item: ParsedItem & { isUnmatched: boolean }
	index: number
}) {
	const rowRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (rowRef.current) {
			animate(
				rowRef.current,
				{ opacity: [0, 1], y: [4, 0] },
				{ duration: 0.2, delay: index * 0.05 },
			)
		}
	}, [index])

	return (
		<div
			ref={rowRef}
			className="flex items-center gap-sm border-b border-[var(--color-border)] px-sm py-xs"
			style={{ opacity: 0 }}
		>
			<span className="flex-1 text-[13px]">{item.productName}</span>
			<span className="font-[family-name:var(--font-geist-mono)] text-[13px]">
				{item.quantity}
			</span>
			<span className="text-[13px] text-[var(--color-text-subtle)]">
				{item.unitOfMeasure}
			</span>
			{item.isUnmatched && (
				<span className="rounded-full bg-[var(--color-warning-bg)] px-2 py-0.5 text-[13px] text-[var(--color-warning)]">
					Unmatched
				</span>
			)}
		</div>
	)
}

// ============================================================================
// Component
// ============================================================================

export function AIAssistMethod() {
	const { t } = useTranslation('portal')
	const addItem = useQuoteBuilderStore((s) => s.addItem)
	const items = useQuoteBuilderStore((s) => s.items)

	const [text, setText] = useState('')
	const [isParsing, setIsParsing] = useState(false)
	const [parsedItems, setParsedItems] = useState<
		Array<ParsedItem & { isUnmatched: boolean }>
	>([])
	const [showResults, setShowResults] = useState(false)

	const handleParse = useCallback(async () => {
		if (!text.trim() || isParsing) return

		setIsParsing(true)
		setParsedItems([])
		setShowResults(false)

		try {
			const result = await parseWithAI({ data: { text: text.trim() } })

			const itemsWithMatch = result.parsedItems.map((item) => ({
				...item,
				isUnmatched: item.matchConfidence < MATCH_CONFIDENCE_THRESHOLD,
			}))

			setParsedItems(itemsWithMatch)
			setShowResults(true)

			// Auto-populate store
			const quoteItems: QuoteItem[] = itemsWithMatch.map((item, idx) => ({
				id: crypto.randomUUID(),
				productId: undefined,
				customerDescription: item.productName,
				quantity: item.quantity,
				unitOfMeasure: item.unitOfMeasure,
				notes: item.notes,
				matchConfidence: item.matchConfidence,
				sortOrder: items.length + idx,
				isUnmatched: item.isUnmatched,
			}))

			for (const qi of quoteItems) {
				addItem(qi)
			}
		} catch {
			// Error handled silently; user can retry
		} finally {
			setIsParsing(false)
		}
	}, [text, isParsing, addItem, items.length])

	const unmatchedCount = parsedItems.filter((i) => i.isUnmatched).length
	const successCount = parsedItems.filter((i) => !i.isUnmatched).length

	return (
		<div className="flex flex-col gap-md">
			{/* Textarea */}
			<TextArea
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder={t(
					'quoteBuilder.aiPlaceholder',
					'Describe what you need in your own words...',
				)}
				rows={6}
				className="w-full resize-none rounded-xl border border-[var(--color-border)] p-md text-sm outline-none focus:border-[var(--color-primary)]"
			/>

			{/* Example text */}
			<Text className="text-[13px] text-[var(--color-text-subtle)]">
				{t(
					'quoteBuilder.aiExample',
					'Example: I need 500 bags of OPC cement 50kg, 200 bundles of 12mm rebar, and 100 sheets of 18mm plywood',
				)}
			</Text>

			{/* Parse button */}
			<Button
				onPress={handleParse}
				isDisabled={!text.trim() || isParsing}
				className="flex h-11 items-center justify-center gap-xs rounded-xl bg-[var(--color-primary)] text-sm font-semibold text-white outline-none transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-50"
			>
				<Sparkles size={16} />
				{isParsing
					? t('quoteBuilder.aiParsing', 'Parsing...')
					: t('quoteBuilder.aiParse', 'Parse with AI')}
			</Button>

			{/* Results */}
			{showResults && parsedItems.length > 0 && (
				<div className="flex flex-col gap-sm rounded-xl border border-[var(--color-border)]">
					{/* Summary */}
					<div className="flex items-center gap-sm border-b border-[var(--color-border)] px-sm py-xs">
						<Text className="text-[13px]">
							{t(
								'quoteBuilder.aiSuccess',
								'{{count}} items parsed successfully',
								{
									count: successCount,
								},
							)}
						</Text>
						{unmatchedCount > 0 && (
							<Text className="text-[13px] text-[var(--color-warning)]">
								{t(
									'quoteBuilder.aiUnmatched',
									'{{count}} items need verification',
									{
										count: unmatchedCount,
									},
								)}
							</Text>
						)}
					</div>

					{/* Parsed items list */}
					{parsedItems.map((item, idx) => (
						<ParsedItemRow
							key={`${item.productName}-${item.quantity}-${item.unitOfMeasure}`}
							item={item}
							index={idx}
						/>
					))}
				</div>
			)}
		</div>
	)
}
