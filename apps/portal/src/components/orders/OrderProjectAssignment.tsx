import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, FolderKanban, LoaderCircle } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OrderDetailResult } from '../../lib/server/deliveries'
import type { getAllCustomerOrders } from '../../lib/server/orders'
import {
	getCustomerProjects,
	setCustomerOrderProject,
} from '../../lib/server/projects'
import { toast } from '../../lib/toast'

type CustomerOrdersResult = Awaited<ReturnType<typeof getAllCustomerOrders>>

interface OrderProjectAssignmentProps {
	className?: string
	orderId: string
	projectId?: string | null
}

export function OrderProjectAssignment({
	className = '',
	orderId,
	projectId,
}: OrderProjectAssignmentProps) {
	const { t } = useTranslation('portal')
	const queryClient = useQueryClient()
	const selectId = useId()
	const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? null)
	const projectsQuery = useQuery({
		queryFn: () => getCustomerProjects(),
		queryKey: ['customer-projects'],
		staleTime: 10_000,
	})

	const assignment = useMutation({
		mutationFn: (nextProjectId: string | null) =>
			setCustomerOrderProject({
				data: { projectId: nextProjectId, quoteRequestId: orderId },
			}),
		onMutate: async (nextProjectId) => {
			await Promise.all([
				queryClient.cancelQueries({ queryKey: ['customer-orders-all'] }),
				queryClient.cancelQueries({ queryKey: ['order-detail', orderId] }),
			])
			const previousOrders = queryClient.getQueryData<CustomerOrdersResult>([
				'customer-orders-all',
			])
			const previousDetail = queryClient.getQueryData<OrderDetailResult | null>(
				['order-detail', orderId],
			)
			setSelectedProjectId(nextProjectId)
			queryClient.setQueryData<CustomerOrdersResult>(
				['customer-orders-all'],
				(current) =>
					current
						? {
								...current,
								orders: current.orders.map((order) =>
									order.id === orderId
										? {
												...order,
												projectId: nextProjectId ?? undefined,
											}
										: order,
								),
							}
						: current,
			)
			queryClient.setQueryData<OrderDetailResult | null>(
				['order-detail', orderId],
				(current) =>
					current
						? {
								...current,
								order: { ...current.order, projectId: nextProjectId },
							}
						: current,
			)
			return { previousDetail, previousOrders }
		},
		onError: (_error, _nextProjectId, context) => {
			setSelectedProjectId(projectId ?? null)
			if (context?.previousOrders) {
				queryClient.setQueryData(
					['customer-orders-all'],
					context.previousOrders,
				)
			}
			if (context?.previousDetail !== undefined) {
				queryClient.setQueryData(
					['order-detail', orderId],
					context.previousDetail,
				)
			}
			toast.error(t('projectsPage.projectUpdateFailed'))
		},
		onSuccess: () => {
			toast.success(t('projectsPage.projectUpdated'))
		},
		onSettled: () => {
			void Promise.all([
				queryClient.invalidateQueries({ queryKey: ['customer-projects'] }),
				queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] }),
				queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] }),
			])
		},
	})

	useEffect(() => {
		if (!assignment.isPending) setSelectedProjectId(projectId ?? null)
	}, [assignment.isPending, projectId])

	const disabled =
		projectsQuery.isLoading || projectsQuery.isError || assignment.isPending
	const statusLabel = projectsQuery.isError
		? t('projectsPage.projectUnavailable')
		: assignment.isPending
			? t('projectsPage.updatingProject')
			: t('projectsPage.moveToProject')

	return (
		<div className={`min-w-0 ${className}`}>
			<label
				htmlFor={selectId}
				className="mb-1 block text-[10px] font-medium text-[var(--p-text-faint)]"
			>
				{statusLabel}
			</label>
			<div
				className={`relative flex h-9 min-w-0 items-center rounded-lg border bg-[var(--p-bg)] transition-colors ${
					projectsQuery.isError
						? 'border-[var(--p-error)]'
						: 'border-[var(--p-border)] focus-within:border-[var(--p-accent)]'
				}`}
			>
				<FolderKanban
					aria-hidden="true"
					size={13}
					strokeWidth={1.7}
					className="pointer-events-none absolute start-2.5 text-[var(--p-text-faint)]"
				/>
				<select
					id={selectId}
					aria-invalid={projectsQuery.isError || undefined}
					disabled={disabled}
					value={selectedProjectId ?? ''}
					onChange={(event) => {
						const nextProjectId = event.currentTarget.value || null
						if (nextProjectId !== selectedProjectId) {
							assignment.mutate(nextProjectId)
						}
					}}
					className="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pe-8 ps-8 text-[11px] font-medium text-[var(--p-text)] outline-none disabled:cursor-wait disabled:text-[var(--p-text-muted)]"
				>
					<option value="">{t('projectsPage.independent')}</option>
					{(projectsQuery.data ?? []).map((project) => (
						<option key={project.id} value={project.id}>
							{project.name}
						</option>
					))}
				</select>
				{assignment.isPending || projectsQuery.isLoading ? (
					<LoaderCircle
						aria-hidden="true"
						size={13}
						className="pointer-events-none absolute end-2.5 animate-spin text-[var(--p-text-faint)]"
					/>
				) : (
					<ChevronDown
						aria-hidden="true"
						size={13}
						className="pointer-events-none absolute end-2.5 text-[var(--p-text-faint)]"
					/>
				)}
			</div>
		</div>
	)
}
