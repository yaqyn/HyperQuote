import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { normalizeIntegerInput } from '../../../lib/inputs'
import { receivePOGoods } from '../../../lib/server/procurement-po'
import type { POItem } from '../../../types/procurement'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../../shared/DispatchDialog'

interface ReceiveGoodsDialogProps {
	poId: string
	items: POItem[]
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

interface ItemReceiptEntry {
	itemId: string
	receivedQuantity: number
	rejectedQuantity: number
}

export function ReceiveGoodsDialog({
	poId,
	items,
	isOpen,
	onOpenChange,
}: ReceiveGoodsDialogProps) {
	const queryClient = useQueryClient()

	const [entries, setEntries] = useState<ItemReceiptEntry[]>(() =>
		items.map((item) => ({
			itemId: item.id,
			receivedQuantity: Math.max(0, item.quantity - item.receivedQuantity),
			rejectedQuantity: 0,
		})),
	)

	const resetEntries = () => {
		setEntries(
			items.map((item) => ({
				itemId: item.id,
				receivedQuantity: Math.max(0, item.quantity - item.receivedQuantity),
				rejectedQuantity: 0,
			})),
		)
	}

	const mutation = useMutation({
		mutationFn: () =>
			receivePOGoods({
				data: { poId, receivedItems: entries },
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['po-detail', poId] })
			queryClient.invalidateQueries({ queryKey: ['po-list'] })
			onOpenChange(false)
		},
	})

	const updateEntry = (
		itemId: string,
		field: 'receivedQuantity' | 'rejectedQuantity',
		value: number,
	) => {
		setEntries((prev) =>
			prev.map((e) =>
				e.itemId === itemId ? { ...e, [field]: Math.max(0, value) } : e,
			),
		)
	}

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={() => {
				if (!mutation.isPending) {
					resetEntries()
					onOpenChange(false)
				}
			}}
			size="lg"
			eyebrow={`PO · ${poId.toUpperCase()}`}
			title="Receive goods"
			caption="Log quantities received and flag any rejections."
			dismissDisabled={mutation.isPending}
		>
			<DispatchBody>
				<div className="overflow-x-auto">
					<table className="w-full font-[family-name:var(--font-archivo)]">
						<thead>
							<tr className="border-b border-black/80 dark:border-white/85">
								{[
									'Product',
									'Ordered',
									'Received',
									'Remaining',
									'Received now',
									'Rejected now',
								].map((h, i) => (
									<th
										key={h}
										className={`pb-2 font-[family-name:var(--font-plex-mono)] text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)] ${
											i === 0 ? 'text-start' : 'text-end'
										}`}
									>
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{items.map((item) => {
								const entry = entries.find((e) => e.itemId === item.id)
								const remaining = Math.max(
									0,
									item.quantity - item.receivedQuantity,
								)
								return (
									<tr
										key={item.id}
										className="border-b border-black/[0.06] dark:border-white/[0.08]"
									>
										<td className="py-3 pe-4 text-[13.5px] text-[var(--color-text)]">
											{item.productName}
										</td>
										<NumCell value={item.quantity} />
										<NumCell value={item.receivedQuantity} muted />
										<NumCell value={remaining} />
										<td className="py-3 text-end">
											<input
												type="text"
												inputMode="numeric"
												pattern="[0-9]*"
												min={0}
												max={remaining}
												value={entry?.receivedQuantity ?? 0}
												onChange={(e) =>
													updateEntry(
														item.id,
														'receivedQuantity',
														Number(normalizeIntegerInput(e.target.value)),
													)
												}
												className="w-20 ms-auto px-2 py-1 text-end bg-transparent outline-none border-b border-black/[0.14] dark:border-white/[0.16] focus:border-[var(--color-primary)] font-[family-name:var(--font-plex-mono)] text-[13px] tabular-nums text-[var(--color-text)]"
											/>
										</td>
										<td className="py-3 text-end">
											<input
												type="text"
												inputMode="numeric"
												pattern="[0-9]*"
												min={0}
												value={entry?.rejectedQuantity ?? 0}
												onChange={(e) =>
													updateEntry(
														item.id,
														'rejectedQuantity',
														Number(normalizeIntegerInput(e.target.value)),
													)
												}
												className="w-20 ms-auto px-2 py-1 text-end bg-transparent outline-none border-b border-black/[0.14] dark:border-white/[0.16] focus:border-[var(--color-primary)] font-[family-name:var(--font-plex-mono)] text-[13px] tabular-nums text-[var(--color-text)]"
											/>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>

				{mutation.isError && (
					<p className="mt-4 font-[family-name:var(--font-archivo)] italic text-[12px] text-[#B3261E]">
						Failed to record receipt. Please try again.
					</p>
				)}
			</DispatchBody>

			<DispatchFooter>
				<DispatchAction
					tone="ghost"
					onPress={() => onOpenChange(false)}
					isDisabled={mutation.isPending}
				>
					Cancel
				</DispatchAction>
				<DispatchAction
					onPress={() => mutation.mutate()}
					isDisabled={mutation.isPending}
				>
					{mutation.isPending ? 'Confirming…' : 'Confirm receipt'}
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}

function NumCell({ value, muted }: { value: number; muted?: boolean }) {
	return (
		<td className="py-3 text-end">
			<span
				className={`font-[family-name:var(--font-plex-mono)] text-[13px] tabular-nums ${
					muted ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'
				}`}
			>
				{value.toLocaleString()}
			</span>
		</td>
	)
}
