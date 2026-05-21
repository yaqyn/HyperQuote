import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
	getReceivingDealDetail,
	type getReceivingQueue,
	getWarehouseEmployees,
	type ReceivingDealDetailView,
	type ReceivingDealRowView,
	recordReceivingAttempt,
	type SecurityMethod,
} from '../../lib/server/warehouse'
import { useWarehouseStore } from '../../stores/warehouse'
import {
	MobileAdvisorMenu,
	MobileStepControls,
	MobileStepMeter,
	mobilePanelClass,
} from './WarehouseMobileStepper'

type Decision = 'receive' | 'reject' | null
type ReceivingMobileStep = 'inspect' | 'reason' | 'signoff'
type ReceivingQueueData = Awaited<ReturnType<typeof getReceivingQueue>>

/**
 * Receiving wizard — per-item binary decisions. Accepted items flip
 * `received: true` and bump stock; rejected items stay on the deal
 * for the next delivery attempt. Same security pattern as outgoing
 * signoff so the action is attributable to a named employee.
 */
export function WarehouseReceivingFlow({ dealId }: { dealId: string | null }) {
	const reduce = useReducedMotion()
	return (
		<AnimatePresence mode="wait">
			{dealId ? (
				<motion.div
					key={dealId}
					initial={reduce ? false : { x: 40, opacity: 0 }}
					animate={{ x: 0, opacity: 1 }}
					exit={reduce ? undefined : { x: 40, opacity: 0 }}
					transition={{ type: 'spring', stiffness: 260, damping: 32 }}
					className="flex h-full w-full shrink-0 lg:w-[55%]"
				>
					<FlowInner dealId={dealId} />
				</motion.div>
			) : (
				<motion.div
					key="empty"
					initial={reduce ? false : { opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={reduce ? undefined : { opacity: 0 }}
					transition={{ duration: 0.2 }}
					className="hidden h-full w-[55%] shrink-0 lg:flex"
				>
					<EmptyPanel />
				</motion.div>
			)}
		</AnimatePresence>
	)
}

function EmptyPanel() {
	return (
		<aside className="flex h-full w-full flex-col items-center justify-center border-s-[3px] border-[var(--color-text)] bg-[var(--color-surface)]">
			<div className="flex flex-col items-center gap-3 px-10 text-center">
				<span
					aria-hidden="true"
					className="font-[family-name:var(--font-geist-mono)] text-[120px] font-bold leading-none text-black/10"
				>
					←
				</span>
				<p className="font-[family-name:var(--font-geist-mono)] text-[13px] font-bold uppercase tracking-[0.22em] text-black/40">
					Pick an arriving deal
				</p>
				<p className="text-[12px] text-black/40 max-w-[340px]">
					Tap a supplier card to start inspecting the delivery. Every item you
					accept flows into stock. Rejected items stay on the deal until the
					supplier comes back with a fix.
				</p>
			</div>
		</aside>
	)
}

function receivingQueueTotals(deals: ReceivingDealRowView[]) {
	return {
		total: deals.length,
		retrying: deals.filter((deal) => deal.previousAttemptCount > 0).length,
		fresh: deals.filter((deal) => deal.previousAttemptCount === 0).length,
	}
}

function updateReceivingQueueCache(
	current: ReceivingQueueData | undefined,
	dealId: string,
	fullyReceived: boolean,
): ReceivingQueueData | undefined {
	if (!current) return current
	const deals = fullyReceived
		? current.deals.filter((deal) => deal.dealId !== dealId)
		: current.deals.map((deal) =>
				deal.dealId === dealId
					? {
							...deal,
							previousAttemptCount: Math.max(1, deal.previousAttemptCount + 1),
						}
					: deal,
			)
	return {
		...current,
		deals,
		totals: receivingQueueTotals(deals),
	}
}

function FlowInner({ dealId }: { dealId: string }) {
	const qc = useQueryClient()
	const scrollAreaRef = useRef<HTMLDivElement | null>(null)
	const { data: deal, isLoading } = useQuery({
		queryKey: ['warehouse-receiving-deal', dealId],
		queryFn: () => getReceivingDealDetail({ data: { dealId } }),
		staleTime: 5_000,
	})

	const { data: employeesData } = useQuery({
		queryKey: ['warehouse-employees'],
		queryFn: () => getWarehouseEmployees({ data: {} }),
		staleTime: 60_000,
	})
	const employees = employeesData?.employees ?? []

	const setSelectedDealId = useWarehouseStore((s) => s.setSelectedDealId)

	// Per-item decision map — starts empty each time the deal loads.
	const [decisions, setDecisions] = useState<Record<string, Decision>>({})
	const [advisorId, setAdvisorId] = useState<string | null>(null)
	const [securityMethod, setSecurityMethod] =
		useState<SecurityMethod>('password')
	const [securityToken, setSecurityToken] = useState('')
	const [rejectionReason, setRejectionReason] = useState('')
	const [proofUrl, setProofUrl] = useState('')
	const [error, setError] = useState<string | null>(null)
	const scrollToTop = () => {
		scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'auto' })
	}

	useEffect(() => {
		setDecisions({})
		setAdvisorId(null)
		setSecurityToken('')
		setRejectionReason('')
		setProofUrl('')
		setError(null)
	}, [])

	const mutation = useMutation({
		mutationFn: () => {
			if (!deal) throw new Error('No deal')
			if (!advisorId) throw new Error('Pick an advisor')
			const pending = deal.items.filter((i) => !i.received)
			return recordReceivingAttempt({
				data: {
					dealId,
					advisorId,
					decisions: pending.map((i) => ({
						productSlug: i.productSlug,
						accepted: decisions[i.productSlug] === 'receive',
					})),
					rejectionReason: rejectionReason.trim() || undefined,
					proofUrl: proofUrl.trim(),
					securityMethod,
					securityToken: securityToken.trim(),
				},
			})
		},
		onSuccess: (res) => {
			if (!res.success) {
				setError(res.error)
				return
			}
			qc.setQueryData<ReceivingQueueData>(
				['warehouse-receiving-queue'],
				(current) =>
					updateReceivingQueueCache(current, dealId, res.fullyReceived),
			)
			qc.invalidateQueries({ queryKey: ['warehouse-receiving-queue'] })
			qc.invalidateQueries({ queryKey: ['warehouse-receiving-deal', dealId] })
			qc.invalidateQueries({ queryKey: ['finance-inbox'] })
			qc.invalidateQueries({ queryKey: ['stock-overview'] })
			qc.invalidateQueries({ queryKey: ['inventory-overview'] })
			setSelectedDealId(null)
			setDecisions({})
			setRejectionReason('')
			setProofUrl('')
			setSecurityToken('')
		},
		onError: (e: Error) => setError(e.message),
	})

	if (isLoading || !deal) {
		return (
			<aside className="flex h-full w-full flex-col items-center justify-center border-[var(--color-text)] bg-[var(--color-surface)] lg:border-s-[3px]">
				<p className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.22em] text-black/40">
					Loading delivery…
				</p>
			</aside>
		)
	}

	const pendingItems = deal.items.filter((i) => !i.received)
	const allDecided = pendingItems.every((i) => decisions[i.productSlug] != null)
	const anyRejected = pendingItems.some(
		(i) => decisions[i.productSlug] === 'reject',
	)
	const nameOk = advisorId !== null
	const tokenOk = securityToken.trim().length > 0
	const proofOk = proofUrl.trim().length > 0
	const reasonOk = !anyRejected || rejectionReason.trim().length >= 3
	const ready = allDecided && nameOk && tokenOk && proofOk && reasonOk

	return (
		<aside className="flex h-full w-full flex-col border-[var(--color-text)] bg-[var(--color-surface)] lg:border-s-[3px]">
			{/* Header */}
			<header className="shrink-0 border-b-2 border-[var(--color-text)] px-4 pt-4 pb-4 sm:px-6 lg:border-b-[3px] lg:px-8 lg:pt-6 lg:pb-5">
				<div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 lg:flex lg:justify-between lg:gap-6">
					<div className="min-w-0">
						<p className="truncate font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.18em] text-black/50 lg:text-[10px] lg:tracking-[0.3em]">
							Receiving · {deal.dealId}
						</p>
						<h2 className="mt-1 truncate text-[22px] font-bold leading-none lg:mt-2 lg:text-[34px]">
							{deal.supplierName}
						</h2>
						<p className="mt-1 truncate font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.1em] text-black/55 lg:mt-2 lg:text-[11px] lg:tracking-[0.14em]">
							{deal.itemCount} items ·{' '}
							{Math.round(deal.totalDue).toLocaleString('en-EG')} EGP
						</p>
					</div>
					<motion.button
						type="button"
						onClick={() => setSelectedDealId(null)}
						whileTap={{ scale: 0.96 }}
						className="hidden shrink-0 border-2 border-[var(--color-text)] bg-[var(--color-surface)] px-3 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text)] hover:bg-[var(--color-text)] hover:text-[#FFFFFF] lg:block lg:border-[3px] lg:px-4 lg:py-2 lg:text-[12px] lg:tracking-[0.18em]"
					>
						Back
					</motion.button>
				</div>
			</header>

			<div
				ref={scrollAreaRef}
				className="flex-1 min-h-0 overflow-y-auto px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:py-6"
			>
				<ReceivingBody
					deal={deal}
					decisions={decisions}
					setDecisions={setDecisions}
					advisorId={advisorId}
					setAdvisorId={setAdvisorId}
					employees={employees}
					securityMethod={securityMethod}
					setSecurityMethod={setSecurityMethod}
					securityToken={securityToken}
					setSecurityToken={setSecurityToken}
					rejectionReason={rejectionReason}
					setRejectionReason={setRejectionReason}
					proofUrl={proofUrl}
					setProofUrl={setProofUrl}
					anyRejected={anyRejected}
					error={error}
					ready={ready}
					pending={mutation.isPending}
					onExit={() => setSelectedDealId(null)}
					onMobileStepChange={scrollToTop}
					onSubmit={() => {
						setError(null)
						mutation.mutate()
					}}
				/>
			</div>
		</aside>
	)
}

// ─── Body ────────────────────────────────────────────────

function ReceivingBody({
	deal,
	decisions,
	setDecisions,
	advisorId,
	setAdvisorId,
	employees,
	securityMethod,
	setSecurityMethod,
	securityToken,
	setSecurityToken,
	rejectionReason,
	setRejectionReason,
	proofUrl,
	setProofUrl,
	anyRejected,
	error,
	ready,
	pending,
	onExit,
	onMobileStepChange,
	onSubmit,
}: {
	deal: ReceivingDealDetailView
	decisions: Record<string, Decision>
	setDecisions: React.Dispatch<React.SetStateAction<Record<string, Decision>>>
	advisorId: string | null
	setAdvisorId: (id: string | null) => void
	employees: { id: string; name: string }[]
	securityMethod: SecurityMethod
	setSecurityMethod: (m: SecurityMethod) => void
	securityToken: string
	setSecurityToken: (v: string) => void
	rejectionReason: string
	setRejectionReason: (v: string) => void
	proofUrl: string
	setProofUrl: (v: string) => void
	anyRejected: boolean
	error: string | null
	ready: boolean
	pending: boolean
	onExit: () => void
	onMobileStepChange: () => void
	onSubmit: () => void
}) {
	const [mobileStep, setMobileStep] = useState<ReceivingMobileStep>('inspect')
	const [mobileAdvisorOpen, setMobileAdvisorOpen] = useState(false)
	const previousMobileStepRef = useRef<ReceivingMobileStep>('inspect')
	const previousPendingItemsRef = useRef<string | null>(null)
	const pendingItems = deal.items.filter((i) => !i.received)
	const pendingItemsSignature = pendingItems
		.map((item) => item.productSlug)
		.join('|')
	const allDecided = pendingItems.every((i) => decisions[i.productSlug] != null)
	const reasonOk = !anyRejected || rejectionReason.trim().length >= 3
	const tokenOk = securityToken.trim().length > 0
	const proofOk = proofUrl.trim().length > 0
	const mobileSteps: ReceivingMobileStep[] = anyRejected
		? ['inspect', 'reason', 'signoff']
		: ['inspect', 'signoff']
	const activeMobileStep = mobileSteps.includes(mobileStep)
		? mobileStep
		: 'signoff'
	const mobileStepIndex = mobileSteps.indexOf(activeMobileStep)
	const mobileStepTitle: Record<ReceivingMobileStep, string> = {
		inspect: 'Inspect items',
		reason: 'Reject reason',
		signoff: 'Receipt signoff',
	}
	const isMobileLast = mobileStepIndex === mobileSteps.length - 1
	const mobileCanAdvance =
		activeMobileStep === 'inspect'
			? allDecided
			: activeMobileStep === 'reason'
				? reasonOk
				: ready
	const selectedAdvisor =
		employees.find((employee) => employee.id === advisorId) ?? null
	const desktopBlocker = !allDecided
		? 'Decide every item first'
		: !reasonOk
			? 'Add rejection reason'
			: !advisorId
				? 'Select advisor'
				: !tokenOk
					? 'Password required'
					: !proofOk
						? 'Proof required before receipt'
						: null

	useEffect(() => {
		if (!anyRejected && mobileStep === 'reason') setMobileStep('signoff')
	}, [anyRejected, mobileStep])

	useEffect(() => {
		const nextPendingItems = `${deal.dealId}:${pendingItemsSignature}`
		if (previousPendingItemsRef.current === nextPendingItems) return
		previousPendingItemsRef.current = nextPendingItems
		setMobileStep('inspect')
		setMobileAdvisorOpen(false)
		previousMobileStepRef.current = 'inspect'
	}, [deal.dealId, pendingItemsSignature])

	useLayoutEffect(() => {
		if (previousMobileStepRef.current !== activeMobileStep) {
			onMobileStepChange()
			previousMobileStepRef.current = activeMobileStep
		}
	}, [activeMobileStep, onMobileStepChange])

	const goToMobileStep = (step: ReceivingMobileStep) => {
		onMobileStepChange()
		setMobileStep(step)
	}

	const resetMobileReceipt = () => {
		setMobileAdvisorOpen(false)
		goToMobileStep('inspect')
	}

	return (
		<div className="flex min-h-full flex-col gap-8">
			<MobileStepMeter title={mobileStepTitle[activeMobileStep]} />

			{deal.previousAttempts.length > 0 && (
				<div
					className={`border-[3px] border-[#CC3300] bg-[#FFF4F0] px-5 py-3 ${mobilePanelClass(
						activeMobileStep === 'inspect',
					)}`}
				>
					<p className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.22em] text-[#CC3300]">
						Prior attempts · {deal.previousAttempts.length}
					</p>
					<p className="mt-1 text-[11px] text-black/60">
						Last:{' '}
						{deal.previousAttempts[deal.previousAttempts.length - 1]
							.rejectionReason || 'no reason recorded'}
					</p>
				</div>
			)}

			{/* Item inspection checklist */}
			<section className={mobilePanelClass(activeMobileStep === 'inspect')}>
				<SectionHeading index="01" title="Inspect every item" />
				<p className="mt-2 text-[12px] leading-relaxed text-black/55 max-w-[480px]">
					Walk the dock. Receive what's good, reject what's damaged or missing.
					Rejected items stay on the deal for the next truck.
				</p>
				<div className="-mx-4 mt-4 flex flex-col sm:-mx-6 lg:mx-0 lg:gap-3">
					{deal.items.map((item) => {
						if (item.received) {
							return (
								<div
									key={item.productSlug}
									className="flex flex-col items-start gap-3 border-y-2 border-x-0 border-[#0A5C2E] bg-[#F0F7F0] px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:border-[3px] lg:px-5"
								>
									<div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#0A5C2E]">
										<svg
											aria-hidden="true"
											width="20"
											height="20"
											viewBox="0 0 22 22"
											fill="none"
										>
											<path
												d="M4 11l5 5 9-10"
												stroke="#FFFFFF"
												strokeWidth="3"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</div>
									<div className="flex-1 min-w-0">
										<p className="truncate text-[15px] font-bold leading-tight">
											{item.productName}
										</p>
										<p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em] text-black/55">
											Already received
										</p>
									</div>
								</div>
							)
						}
						const decision = decisions[item.productSlug] ?? null
						return (
							<div
								key={item.productSlug}
								className="border-y-2 border-x-0 border-[var(--color-text)] bg-[var(--color-surface)] px-4 py-4 sm:px-6 lg:border-[3px] lg:px-5"
							>
								<div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
									<div className="min-w-0">
										<p className="truncate text-[16px] font-bold leading-tight">
											{item.productName}
										</p>
										<p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em] text-black/55">
											{item.sku} · {item.agreedQty} {item.unit}
										</p>
									</div>
									<p className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/50">
										{Math.round(item.lineTotal).toLocaleString('en-EG')} EGP
									</p>
								</div>
								<div className="mt-3 grid grid-cols-2 gap-2">
									<DecisionButton
										active={decision === 'receive'}
										color="#0A5C2E"
										onPress={() =>
											setDecisions((prev) => ({
												...prev,
												[item.productSlug]: 'receive',
											}))
										}
										label="Receive"
									/>
									<DecisionButton
										active={decision === 'reject'}
										color="#CC3300"
										onPress={() =>
											setDecisions((prev) => ({
												...prev,
												[item.productSlug]: 'reject',
											}))
										}
										label="Reject"
									/>
								</div>
							</div>
						)
					})}
				</div>
			</section>

			{/* Rejection reason — only when something is rejected */}
			<AnimatePresence>
				{anyRejected && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.24 }}
						className={`overflow-hidden ${mobilePanelClass(
							activeMobileStep === 'reason',
						)}`}
					>
						<SectionHeading index="02" title="Why rejected?" />
						<p className="mt-2 text-[12px] text-black/55 max-w-[480px]">
							Short note for the audit trail — the supplier will see this
							context when they re-attempt.
						</p>
						<input
							type="text"
							value={rejectionReason}
							onChange={(e) => setRejectionReason(e.target.value)}
							placeholder="e.g. 3 bags of cement torn, 5 rebar bars bent"
							className="mt-3 w-full border-[3px] border-[#CC3300] bg-[var(--color-surface)] px-4 py-3 text-[16px] outline-none placeholder:text-black/30"
							style={{ minHeight: '56px' }}
						/>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Mobile signoff */}
			<section
				className={
					activeMobileStep === 'signoff' ? 'block lg:hidden' : 'hidden'
				}
			>
				<div className="flex flex-col gap-4">
					<MobileAdvisorMenu
						employees={employees}
						selectedAdvisor={selectedAdvisor}
						isOpen={mobileAdvisorOpen}
						onToggle={() => setMobileAdvisorOpen((open) => !open)}
						onSelect={(employeeId) => {
							setAdvisorId(employeeId)
							setMobileAdvisorOpen(false)
						}}
					/>

					<AnimatePresence initial={false}>
						{advisorId && (
							<motion.label
								key="receiving-mobile-password"
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -6 }}
								transition={{ duration: 0.2 }}
								className="flex flex-col gap-2"
							>
								<span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
									Password
								</span>
								<input
									type="password"
									value={securityToken}
									onChange={(event) => {
										setSecurityMethod('password')
										setSecurityToken(event.target.value)
									}}
									placeholder="Employee password"
									autoComplete="off"
									className="h-12 w-full border-2 border-[var(--color-text)] bg-[var(--color-surface)] px-3 text-[16px] outline-none placeholder:text-black/30"
								/>
							</motion.label>
						)}
					</AnimatePresence>

					<AnimatePresence initial={false}>
						{tokenOk && (
							<motion.label
								key="receiving-mobile-proof"
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -6 }}
								transition={{ duration: 0.2 }}
								className="flex flex-col gap-2"
							>
								<span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
									Proof
								</span>
								<input
									type="text"
									value={proofUrl}
									onChange={(event) => setProofUrl(event.target.value)}
									placeholder="Photo, receipt, or note reference"
									className="h-12 w-full border-2 border-[var(--color-text)] bg-[var(--color-surface)] px-3 text-[16px] outline-none placeholder:text-black/30"
								/>
							</motion.label>
						)}
					</AnimatePresence>
				</div>
			</section>

			{/* Advisor picker */}
			<section className="hidden lg:block">
				<SectionHeading index="03" title="Advisor" />
				<p className="mt-2 text-[12px] text-black/55 max-w-[480px]">
					Who inspected the delivery. Name comes from the employee directory.
				</p>
				<div className="mt-3 flex flex-col gap-2 md:grid md:grid-cols-2">
					{employees.map((e) => {
						const active = advisorId === e.id
						return (
							<motion.button
								key={e.id}
								type="button"
								onClick={() => setAdvisorId(e.id)}
								whileTap={{ scale: 0.97 }}
								animate={{
									backgroundColor: active ? 'var(--color-text)' : '#FFFFFF',
									color: active ? '#FFFFFF' : 'var(--color-text)',
								}}
								transition={{ duration: 0.18 }}
								className="border-[3px] border-[var(--color-text)] px-4 py-3 text-start"
								style={{ minHeight: '56px' }}
							>
								<p className="text-[14px] font-bold leading-tight">{e.name}</p>
								<p
									className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em]"
									style={{ opacity: active ? 0.7 : 0.45 }}
								>
									{e.id}
								</p>
							</motion.button>
						)
					})}
				</div>
			</section>

			{/* Security pass */}
			<section className="hidden lg:block">
				<SectionHeading index="04" title="Your credential" />
				<p className="mt-2 text-[11px] text-black/55 max-w-[480px]">
					Type <strong>your own</strong> password or scan{' '}
					<strong>your badge</strong>. Ties the receipt to whoever authenticates
					here.
				</p>
				<div className="mt-3 flex flex-col gap-2 sm:grid sm:grid-cols-2">
					<SecurityTab
						active={securityMethod === 'password'}
						onPress={() => {
							setSecurityMethod('password')
							setSecurityToken('')
						}}
						label="Password"
					/>
					<SecurityTab
						active={securityMethod === 'qr'}
						onPress={() => {
							setSecurityMethod('qr')
							setSecurityToken('')
						}}
						label="QR Scan"
					/>
				</div>
				<input
					type={securityMethod === 'password' ? 'password' : 'text'}
					value={securityToken}
					onChange={(e) => setSecurityToken(e.target.value)}
					placeholder={
						securityMethod === 'password' ? 'Your password' : 'Scan your badge'
					}
					autoComplete="off"
					className="mt-3 w-full border-[3px] border-[var(--color-text)] bg-[var(--color-surface)] px-4 py-3 text-[16px] outline-none placeholder:text-black/30"
					style={{ minHeight: '56px' }}
				/>
			</section>

			{/* Proof */}
			<section className="hidden lg:block">
				<SectionHeading index="05" title="Proof of receipt" />
				<input
					type="text"
					value={proofUrl}
					onChange={(e) => setProofUrl(e.target.value)}
					placeholder="e.g. receipt-photo-bay01.jpg"
					className="mt-3 w-full border-[3px] border-[var(--color-text)] bg-[var(--color-surface)] px-4 py-3 text-[16px] outline-none placeholder:text-black/30"
					style={{ minHeight: '56px' }}
				/>
			</section>

			<AnimatePresence>
				{error && (
					<motion.div
						initial={{ opacity: 0, y: -6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -6 }}
						className="border-[3px] border-[#CC3300] bg-[#FFF0ED] px-4 py-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-[#CC3300]"
					>
						{error}
					</motion.div>
				)}
			</AnimatePresence>

			<div className="hidden lg:block">
				{desktopBlocker && (
					<p className="mb-2 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
						{desktopBlocker}
					</p>
				)}
				<motion.button
					type="button"
					onClick={onSubmit}
					disabled={!ready || pending}
					whileTap={ready ? { scale: 0.98 } : undefined}
					animate={{
						backgroundColor: ready ? '#0A5C2E' : 'rgba(0,0,0,0.05)',
						color: ready ? '#FFFFFF' : 'rgba(0,0,0,0.3)',
					}}
					transition={{ duration: 0.25 }}
					className="w-full border-[3px] border-[var(--color-text)] py-5 font-[family-name:var(--font-geist-mono)] text-[14px] font-bold uppercase tracking-[0.22em] enabled:hover:shadow-[6px_6px_0_0_var(--color-text)] disabled:cursor-not-allowed"
				>
					{pending ? 'Recording…' : 'Commit receipt'}
				</motion.button>
			</div>

			<MobileStepControls
				backLabel={mobileStepIndex > 0 ? 'Reset' : 'Exit'}
				secondaryKind={mobileStepIndex > 0 ? 'reset' : 'exit'}
				onBack={mobileStepIndex > 0 ? resetMobileReceipt : onExit}
				primaryLabel={isMobileLast ? 'Finish receipt' : 'Next'}
				onPrimary={
					isMobileLast
						? onSubmit
						: () => goToMobileStep(mobileSteps[mobileStepIndex + 1])
				}
				primaryDisabled={!mobileCanAdvance || pending}
				isPending={isMobileLast ? pending : false}
				tone={isMobileLast ? 'green' : 'dark'}
			>
				<p className="mb-2 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em] text-black/45">
					{activeMobileStep === 'inspect'
						? `${Object.values(decisions).filter(Boolean).length}/${pendingItems.length} decided`
						: activeMobileStep === 'reason'
							? 'Reason required before signoff'
							: !advisorId
								? 'Select advisor'
								: !tokenOk
									? 'Password required'
									: !proofOk
										? 'Proof required before receipt'
										: 'Ready to record receipt'}
				</p>
			</MobileStepControls>
		</div>
	)
}

function SectionHeading({ index, title }: { index: string; title: string }) {
	return (
		<div className="flex items-baseline gap-4">
			<span className="font-[family-name:var(--font-geist-mono)] text-[26px] font-bold leading-none tabular-nums text-black/20">
				{index}
			</span>
			<h3 className="font-[family-name:var(--font-geist-mono)] text-[14px] font-bold uppercase tracking-[0.2em]">
				{title}
			</h3>
		</div>
	)
}

function DecisionButton({
	active,
	color,
	onPress,
	label,
}: {
	active: boolean
	color: string
	onPress: () => void
	label: string
}) {
	return (
		<motion.button
			type="button"
			onClick={onPress}
			whileTap={{ scale: 0.97 }}
			animate={{
				backgroundColor: active ? color : '#FFFFFF',
				color: active ? '#FFFFFF' : 'var(--color-text)',
			}}
			transition={{ duration: 0.2 }}
			className="border-2 border-[var(--color-text)] py-3 text-center font-[family-name:var(--font-geist-mono)] text-[12px] font-bold uppercase tracking-[0.14em] lg:border-[3px] lg:text-[13px] lg:tracking-[0.16em]"
			style={{ minHeight: '52px' }}
		>
			{label}
		</motion.button>
	)
}

function SecurityTab({
	active,
	onPress,
	label,
}: {
	active: boolean
	onPress: () => void
	label: string
}) {
	return (
		<motion.button
			type="button"
			onClick={onPress}
			whileTap={{ scale: 0.97 }}
			animate={{
				backgroundColor: active ? 'var(--color-text)' : '#FFFFFF',
				color: active ? '#FFFFFF' : 'var(--color-text)',
			}}
			transition={{ duration: 0.2 }}
			className="border-[3px] border-[var(--color-text)] py-3 font-[family-name:var(--font-geist-mono)] text-[11px] font-bold uppercase tracking-[0.2em]"
		>
			{label}
		</motion.button>
	)
}
