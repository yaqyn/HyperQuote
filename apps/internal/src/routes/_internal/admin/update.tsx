import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import {
	getLogisUpdateStatus,
	requestLogisStableUpdate,
} from '../../../lib/server/logis-update'

export const Route = createFileRoute('/_internal/admin/update')({
	component: AdminUpdateRoute,
})

function AdminUpdateRoute() {
	const [password, setPassword] = useState('')
	const [confirmation, setConfirmation] = useState('')
	const status = useQuery({
		queryKey: ['logis-update-status'],
		queryFn: () => getLogisUpdateStatus(),
	})
	const mutation = useMutation({
		mutationFn: () =>
			requestLogisStableUpdate({ data: { confirmation, password } }),
	})
	const data = status.data

	return (
		<main className="min-h-dvh bg-[#f7f5ef] px-4 py-6 text-[#1d1d1b] sm:px-6 lg:px-8">
			<section className="mx-auto flex max-w-3xl flex-col gap-5">
				<header className="flex items-start justify-between gap-4 border-[#1d1d1b]/15 border-b pb-5">
					<div>
						<p className="font-mono text-[#6d6a61] text-xs uppercase tracking-[0.12em]">
							LOGIS stable
						</p>
						<h1 className="mt-2 font-semibold text-2xl">Company update</h1>
					</div>
					<ShieldCheck aria-hidden="true" className="mt-1 size-6" />
				</header>

				{status.isLoading ? (
					<p className="text-[#6d6a61] text-sm">Loading update status.</p>
				) : status.isError || !data ? (
					<p className="text-red-700 text-sm">Update status is unavailable.</p>
				) : (
					<>
						<div className="grid gap-3 sm:grid-cols-2">
							<StatusItem label="Company" value={data.companySlug} />
							<StatusItem label="Channel" value={data.releaseChannel} />
							<StatusItem label="Current version" value={data.currentVersion} />
							<StatusItem
								label="Control service"
								value={data.configured ? 'configured' : 'not configured'}
							/>
						</div>

						<div className="flex flex-wrap gap-3 text-sm">
							<a className="underline" href={data.changelogUrl}>
								Changelog
							</a>
							{data.lastDeployStatusUrl ? (
								<a className="underline" href={data.lastDeployStatusUrl}>
									Deploy status
								</a>
							) : null}
						</div>

						<form
							className="grid gap-3 border-[#1d1d1b]/15 border-t pt-5"
							onSubmit={(event) => {
								event.preventDefault()
								mutation.mutate()
							}}
						>
							<label className="grid gap-1 text-sm">
								<span className="font-medium">Current password</span>
								<input
									autoComplete="current-password"
									className="h-11 border border-[#1d1d1b]/20 bg-white px-3"
									onChange={(event) => setPassword(event.target.value)}
									type="password"
									value={password}
								/>
							</label>
							<label className="grid gap-1 text-sm">
								<span className="font-medium">
									Type UPDATE {data.companySlug}
								</span>
								<input
									className="h-11 border border-[#1d1d1b]/20 bg-white px-3 font-mono"
									onChange={(event) => setConfirmation(event.target.value)}
									value={confirmation}
								/>
							</label>
							<button
								className="inline-flex h-11 w-fit items-center gap-2 bg-[#1d1d1b] px-4 font-medium text-sm text-white disabled:opacity-45"
								disabled={
									!data.canUpdate ||
									!data.configured ||
									mutation.isPending ||
									confirmation !== `UPDATE ${data.companySlug}` ||
									password.length === 0
								}
								type="submit"
							>
								<RefreshCw aria-hidden="true" className="size-4" />
								Update stable
							</button>
							<ResultMessage result={mutation.data} />
						</form>
					</>
				)}
			</section>
		</main>
	)
}

function StatusItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="border border-[#1d1d1b]/15 bg-white p-3">
			<p className="text-[#6d6a61] text-xs uppercase">{label}</p>
			<p className="mt-1 break-all font-medium text-sm">{value}</p>
		</div>
	)
}

function ResultMessage({
	result,
}: {
	result?: Awaited<ReturnType<typeof requestLogisStableUpdate>>
}) {
	if (!result) return null
	if (result.ok) {
		return (
			<p className="text-green-700 text-sm">
				Update requested: {result.requestId}
			</p>
		)
	}
	return <p className="text-red-700 text-sm">Update rejected: {result.error}</p>
}
