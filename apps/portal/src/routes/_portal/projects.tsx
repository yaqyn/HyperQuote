import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
	ArrowRight,
	FolderKanban,
	LoaderCircle,
	MoreHorizontal,
	Plus,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { OrderProjectAssignment } from '../../components/orders/OrderProjectAssignment'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'
import { portalHead } from '../../lib/page-meta'
import { getAllCustomerOrders } from '../../lib/server/orders'
import {
	createCustomerProject,
	getCustomerProjects,
} from '../../lib/server/projects'
import { usePortalStore } from '../../stores/portal'
import type { Order } from '../../types/order'

export const Route = createFileRoute('/_portal/projects')({
	head: () =>
		portalHead({
			description:
				'Customer project workspaces for related HyperQuote drafts, quote requests, orders, and deliveries.',
			path: '/projects',
			title: 'Projects — HyperQuote Portal',
		}),
	component: ProjectsPage,
})

const INDEPENDENT_WORKSPACE_ID = '__independent__'

function ProjectsPage() {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const setPendingProjectId = usePortalStore(
		(state) => state.setPendingProjectId,
	)
	const [selectedId, setSelectedId] = useState(INDEPENDENT_WORKSPACE_ID)
	const [createOpen, setCreateOpen] = useState(false)
	const [projectName, setProjectName] = useState('')

	const projectsQuery = useQuery({
		queryFn: () => getCustomerProjects(),
		queryKey: ['customer-projects'],
		staleTime: 10_000,
	})
	const ordersQuery = useQuery({
		queryFn: () => getAllCustomerOrders(),
		queryKey: ['customer-orders-all'],
		staleTime: 5_000,
	})
	const projects = projectsQuery.data ?? []
	const orders = ordersQuery.data?.orders ?? []

	useEffect(() => {
		if (
			selectedId === INDEPENDENT_WORKSPACE_ID ||
			projects.some((project) => project.id === selectedId)
		) {
			return
		}
		setSelectedId(INDEPENDENT_WORKSPACE_ID)
	}, [projects, selectedId])

	const selectedProject = projects.find((project) => project.id === selectedId)
	const isIndependent = selectedId === INDEPENDENT_WORKSPACE_ID
	const independentOrderCount = orders.filter(
		(order) => !order.projectId,
	).length
	const selectedOrders = useMemo(
		() =>
			orders
				.filter((order) =>
					isIndependent ? !order.projectId : order.projectId === selectedId,
				)
				.sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
				),
		[isIndependent, orders, selectedId],
	)

	const createMutation = useMutation({
		mutationFn: (name: string) => createCustomerProject({ data: { name } }),
		onSuccess: async ({ project }) => {
			await queryClient.invalidateQueries({ queryKey: ['customer-projects'] })
			setSelectedId(project.id)
			setProjectName('')
			setCreateOpen(false)
		},
	})
	function startOrder(projectId: string | undefined) {
		setPendingProjectId(projectId)
		navigate({ to: '/market' })
	}

	const loading = projectsQuery.isLoading || ordersQuery.isLoading
	const failed = projectsQuery.isError || ordersQuery.isError

	return (
		<div className="flex h-full min-h-0 flex-col bg-[var(--p-bg)]">
			<header className="shrink-0 border-b border-[var(--p-border)] px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5 lg:px-10">
				<div className="mx-auto flex w-full max-w-[1420px] items-center justify-between gap-4">
					<PortalTitleRow title={t('projectsPage.title')} className="flex-1" />
					<button
						type="button"
						onClick={() => setCreateOpen(true)}
						className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--p-border-strong)] bg-[var(--p-text)] px-4 text-[13px] font-semibold text-[var(--p-bg)] transition-opacity hover:opacity-85"
					>
						<Plus size={15} strokeWidth={2} />
						{t('projectsPage.newProject')}
					</button>
				</div>
			</header>

			{createOpen && (
				<form
					onSubmit={(event) => {
						event.preventDefault()
						const name = projectName.trim()
						if (name.length >= 2) createMutation.mutate(name)
					}}
					className="shrink-0 border-b border-[var(--p-border)] bg-[var(--p-card)] px-4 py-3 sm:px-6 lg:px-10"
				>
					<div className="mx-auto flex w-full max-w-[1420px] items-center gap-2">
						<input
							value={projectName}
							onChange={(event) => setProjectName(event.currentTarget.value)}
							placeholder={t('projectsPage.namePlaceholder')}
							className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 text-[13px] text-[var(--p-text)] outline-none focus:border-[var(--p-accent)]"
						/>
						<button
							type="submit"
							disabled={
								createMutation.isPending || projectName.trim().length < 2
							}
							className="h-10 rounded-xl bg-[var(--p-accent)] px-4 text-[12px] font-semibold text-white disabled:opacity-40"
						>
							{createMutation.isPending
								? t('projectsPage.creating')
								: t('projectsPage.create')}
						</button>
						<button
							type="button"
							onClick={() => setCreateOpen(false)}
							className="h-10 px-2 text-[12px] font-medium text-[var(--p-text-muted)]"
						>
							{t('projectsPage.cancel')}
						</button>
					</div>
				</form>
			)}

			{loading ? (
				<div className="flex flex-1 items-center justify-center">
					<LoaderCircle className="animate-spin text-[var(--p-text-faint)]" />
				</div>
			) : failed ? (
				<div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-[var(--p-text-muted)]">
					{t('projectsPage.loadError')}
				</div>
			) : projects.length === 0 && orders.length === 0 ? (
				<ProjectEmpty onCreate={() => setCreateOpen(true)} />
			) : (
				<div className="mx-auto grid min-h-0 w-full max-w-[1420px] flex-1 lg:grid-cols-[310px_minmax(0,1fr)]">
					<aside className="min-h-0 overflow-y-auto border-b border-[var(--p-border)] p-3 sm:p-4 lg:border-b-0 lg:border-e">
						<div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
							<ProjectNavRow
								active={isIndependent}
								name={t('projectsPage.independentOrders')}
								onClick={() => setSelectedId(INDEPENDENT_WORKSPACE_ID)}
								recordCountLabel={t('projectsPage.recordCount', {
									count: independentOrderCount,
								})}
							/>
							{projects.map((project) => (
								<ProjectNavRow
									key={project.id}
									active={project.id === selectedId}
									name={project.name}
									onClick={() => setSelectedId(project.id)}
									recordCountLabel={t('projectsPage.recordCount', {
										count:
											project.draftCount +
											project.requestCount +
											project.orderCount,
									})}
								/>
							))}
						</div>
					</aside>

					<main className="min-h-0 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
						<div className="mx-auto w-full max-w-[920px]">
							<div className="flex items-start justify-between gap-5 border-b border-[var(--p-border)] pb-6">
								<div className="min-w-0">
									<p className="voice-mono text-[9px] uppercase tracking-[0.2em] text-[var(--p-text-faint)]">
										{t('projectsPage.workspace')}
									</p>
									<h1 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-[var(--p-text)] sm:text-[34px]">
										{selectedProject?.name ??
											t('projectsPage.independentOrders')}
									</h1>
									{selectedProject?.description ? (
										<p className="mt-2 max-w-[620px] text-[13px] leading-6 text-[var(--p-text-muted)]">
											{selectedProject.description}
										</p>
									) : isIndependent ? (
										<p className="mt-2 max-w-[620px] text-[13px] leading-6 text-[var(--p-text-muted)]">
											{t('projectsPage.independentBody')}
										</p>
									) : null}
								</div>
								<button
									type="button"
									onClick={() => startOrder(selectedProject?.id)}
									className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-4 text-[12px] font-semibold text-[var(--p-text)] hover:bg-[var(--p-hover)]"
								>
									<Plus size={14} />
									{t('projectsPage.newOrder')}
								</button>
							</div>

							<div className="mt-6">
								<p className="voice-mono text-[9px] uppercase tracking-[0.2em] text-[var(--p-text-faint)]">
									{t('projectsPage.records')}
								</p>
								<div className="mt-2 divide-y divide-[var(--p-border)] border-y border-[var(--p-border)]">
									{selectedOrders.length === 0 ? (
										<p className="py-12 text-center text-[13px] text-[var(--p-text-muted)]">
											{t('projectsPage.emptyProject')}
										</p>
									) : (
										selectedOrders.map((order) => (
											<ProjectOrderRow
												key={order.id}
												onOpen={() =>
													navigate({
														params: { orderId: order.id },
														to: '/orders/$orderId',
													})
												}
												order={order}
											/>
										))
									)}
								</div>
							</div>
						</div>
					</main>
				</div>
			)}
		</div>
	)
}

function ProjectNavRow({
	active,
	name,
	onClick,
	recordCountLabel,
}: {
	active: boolean
	name: string
	onClick: () => void
	recordCountLabel: string
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-current={active ? 'true' : undefined}
			className={`group flex min-h-[62px] items-center gap-3 rounded-xl border px-3 text-start transition-colors ${
				active
					? 'border-[var(--p-border-strong)] bg-[var(--p-card)]'
					: 'border-transparent hover:border-[var(--p-border)] hover:bg-[var(--p-hover)]'
			}`}
		>
			<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--p-border)] bg-[var(--p-bg)] text-[var(--p-text-muted)]">
				<FolderKanban size={16} strokeWidth={1.65} />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate text-[13px] font-semibold text-[var(--p-text)]">
					{name}
				</span>
				<span className="mt-0.5 block text-[10px] text-[var(--p-text-faint)]">
					{recordCountLabel}
				</span>
			</span>
			<ArrowRight
				size={13}
				className="text-[var(--p-text-faint)] rtl:rotate-180"
			/>
		</button>
	)
}

function ProjectOrderRow({
	onOpen,
	order,
}: {
	onOpen: () => void
	order: Order
}) {
	const { t } = useTranslation('portal')
	const status = humanStatus(order.status ?? order.type)
	return (
		<article className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
			<button type="button" onClick={onOpen} className="min-w-0 text-start">
				<div className="flex items-center gap-2">
					<span className="h-1.5 w-1.5 rounded-full bg-[var(--p-accent)]" />
					<p className="truncate text-[13px] font-semibold text-[var(--p-text)]">
						{order.name || order.reference || order.description}
					</p>
				</div>
				<p className="mt-1 truncate ps-3.5 text-[11px] text-[var(--p-text-muted)]">
					{status} · {order.itemCount}{' '}
					{t('projectsPage.material', { count: order.itemCount })}
				</p>
			</button>
			<div className="flex items-center gap-2">
				<OrderProjectAssignment
					className="w-44 sm:w-48"
					orderId={order.id}
					projectId={order.projectId}
				/>
				<button
					type="button"
					onClick={onOpen}
					aria-label={t('projectsPage.openRecord')}
					className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--p-text-faint)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
				>
					<MoreHorizontal size={16} />
				</button>
			</div>
		</article>
	)
}

function ProjectEmpty({ onCreate }: { onCreate: () => void }) {
	const { t } = useTranslation('portal')
	return (
		<div className="flex flex-1 items-center justify-center px-6 py-16">
			<div className="max-w-md text-center">
				<FolderKanban
					size={28}
					strokeWidth={1.4}
					className="mx-auto text-[var(--p-text-faint)]"
				/>
				<h1 className="mt-5 text-[26px] font-semibold tracking-[-0.03em] text-[var(--p-text)]">
					{t('projectsPage.emptyTitle')}
				</h1>
				<p className="mt-2 text-[13px] leading-6 text-[var(--p-text-muted)]">
					{t('projectsPage.emptyBody')}
				</p>
				<button
					type="button"
					onClick={onCreate}
					className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--p-text)] px-4 text-[12px] font-semibold text-[var(--p-bg)]"
				>
					<Plus size={14} />
					{t('projectsPage.newProject')}
				</button>
			</div>
		</div>
	)
}

function humanStatus(status: string) {
	return status
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}
