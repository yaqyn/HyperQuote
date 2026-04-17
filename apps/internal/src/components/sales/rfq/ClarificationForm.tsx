import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { requestClarification } from '../../../lib/server/sales-rfq'
import type { ClarificationQuestionType } from '../../../types/sales'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
	DispatchInputClass,
	DispatchSection,
} from '../../shared/DispatchDialog'

const QUESTION_TYPES: { type: ClarificationQuestionType; label: string }[] = [
	{
		type: 'material_spec_ambiguous',
		label: 'Material specification is ambiguous or incomplete',
	},
	{
		type: 'quantity_unclear',
		label: 'Quantity is unclear or possibly incorrect',
	},
	{
		type: 'delivery_access',
		label: 'Delivery access or site requirements need clarification',
	},
	{ type: 'no_date', label: 'No delivery date provided' },
	{ type: 'mixed_units', label: 'Mixed or inconsistent units of measurement' },
	{
		type: 'missing_attachment',
		label: 'Referenced attachment or document is missing',
	},
]

interface ClarificationFormProps {
	rfqId: string
	isOpen: boolean
	onClose: () => void
}

export function ClarificationForm({
	rfqId,
	isOpen,
	onClose,
}: ClarificationFormProps) {
	const queryClient = useQueryClient()
	const [selectedTypes, setSelectedTypes] = useState<
		Set<ClarificationQuestionType>
	>(new Set())
	const [freeText, setFreeText] = useState('')

	const mutation = useMutation({
		mutationFn: () => {
			const questions = Array.from(selectedTypes).map((type) => ({
				type,
				freeText: undefined as string | undefined,
			}))
			if (freeText.trim()) {
				if (questions.length > 0) {
					questions[questions.length - 1].freeText = freeText.trim()
				} else {
					questions.push({
						type: 'material_spec_ambiguous' as ClarificationQuestionType,
						freeText: freeText.trim(),
					})
				}
			}
			return requestClarification({ data: { rfqId, questions } })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
			queryClient.invalidateQueries({ queryKey: ['rfq-detail', rfqId] })
			setSelectedTypes(new Set())
			setFreeText('')
			onClose()
		},
	})

	const toggleType = (type: ClarificationQuestionType) => {
		setSelectedTypes((prev) => {
			const next = new Set(prev)
			next.has(type) ? next.delete(type) : next.add(type)
			return next
		})
	}

	const canSubmit = selectedTypes.size > 0 || freeText.trim().length > 0

	function handleClose() {
		if (mutation.isPending) return
		setSelectedTypes(new Set())
		setFreeText('')
		onClose()
	}

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={handleClose}
			size="md"
			eyebrow={`RFQ · ${rfqId.toUpperCase()}`}
			title="Request clarification"
			caption="The customer is pinged via portal, email, and WhatsApp."
			dismissDisabled={mutation.isPending}
		>
			<DispatchBody>
				<DispatchSection label="What needs clarifying" />
				<ul className="space-y-1">
					{QUESTION_TYPES.map(({ type, label }) => {
						const on = selectedTypes.has(type)
						return (
							<li key={type}>
								<label
									className={`flex items-start gap-3 cursor-pointer px-3 py-2.5 border transition-colors ${
										on
											? 'border-[var(--color-text)] bg-[var(--color-text)]/[0.03]'
											: 'border-black/[0.12] dark:border-white/[0.14] hover:border-[var(--color-text)]/60'
									}`}
								>
									<span
										aria-hidden
										className={`mt-0.5 inline-flex w-4 h-4 items-center justify-center border ${
											on
												? 'bg-[var(--color-text)] border-[var(--color-text)] text-[var(--color-surface)]'
												: 'border-black/60 dark:border-white/60'
										}`}
									>
										{on && (
											<svg
												aria-hidden="true"
												width="10"
												height="10"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="3"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<path d="M20 6L9 17l-5-5" />
											</svg>
										)}
									</span>
									<input
										type="checkbox"
										checked={on}
										onChange={() => toggleType(type)}
										className="sr-only"
									/>
									<span className="font-[family-name:var(--font-archivo)] text-[13.5px] text-[var(--color-text)]">
										{label}
									</span>
								</label>
							</li>
						)
					})}
				</ul>

				<DispatchSection label="Additional questions" />
				<textarea
					value={freeText}
					onChange={(e) => setFreeText(e.target.value)}
					placeholder="Any additional questions or details needed…"
					rows={3}
					className={`${DispatchInputClass()} resize-none`}
				/>
			</DispatchBody>

			<DispatchFooter>
				<DispatchAction
					tone="ghost"
					onPress={handleClose}
					isDisabled={mutation.isPending}
				>
					Cancel
				</DispatchAction>
				<DispatchAction
					onPress={() => mutation.mutate()}
					isDisabled={!canSubmit || mutation.isPending}
				>
					{mutation.isPending ? 'Sending…' : 'Send request'}
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}
