import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button as AriaButton } from 'react-aria-components'
import { reassignRFQ } from '../../../lib/server/sales-rfq'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../../shared/DispatchDialog'

const TEAM_MEMBERS = [
	{ id: 'user-001', name: 'Ahmed Hassan' },
	{ id: 'user-002', name: 'Mariam Farouk' },
	{ id: 'user-003', name: 'Omar Khaled' },
]

interface AssignRFQDialogProps {
	rfqId: string
	isOpen: boolean
	onClose: () => void
}

export function AssignRFQDialog({
	rfqId,
	isOpen,
	onClose,
}: AssignRFQDialogProps) {
	const queryClient = useQueryClient()

	const mutation = useMutation({
		mutationFn: (assigneeId: string) =>
			reassignRFQ({ data: { rfqId, toUserId: assigneeId } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
			queryClient.invalidateQueries({ queryKey: ['rfq-detail', rfqId] })
			onClose()
		},
	})

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={onClose}
			size="sm"
			eyebrow={`RFQ · ${rfqId.toUpperCase()}`}
			title="Reassign"
			caption="Hand this off to another rep."
			dismissDisabled={mutation.isPending}
		>
			<DispatchBody>
				<ul className="divide-y divide-black/[0.08] dark:divide-white/[0.1]">
					{TEAM_MEMBERS.map((member) => (
						<li key={member.id}>
							<AriaButton
								onPress={() => mutation.mutate(member.id)}
								isDisabled={mutation.isPending}
								className="w-full flex items-center gap-4 py-3 outline-none cursor-pointer data-[hovered]:bg-black/[0.03] dark:data-[hovered]:bg-white/[0.04] px-2 data-[disabled]:opacity-40 transition-colors"
							>
								<span className="inline-flex h-9 w-9 items-center justify-center border border-black/80 dark:border-white/85 font-[family-name:var(--font-plex-mono)] text-[11px] font-semibold uppercase text-[var(--color-text)]">
									{member.name
										.split(' ')
										.map((n) => n[0])
										.join('')}
								</span>
								<span className="font-[family-name:var(--font-archivo)] text-[14px] font-medium text-[var(--color-text)]">
									{member.name}
								</span>
								<span className="ms-auto font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
									assign →
								</span>
							</AriaButton>
						</li>
					))}
				</ul>
			</DispatchBody>

			<DispatchFooter>
				<DispatchAction tone="ghost" onPress={onClose}>
					Cancel
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}
