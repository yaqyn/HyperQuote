/**
 * Profile — customer record panel backed by Supabase.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import {
	AlertTriangle,
	BadgeCheck,
	CalendarDays,
	Check,
	Clock,
	KeyRound,
	Loader2,
	LockKeyhole,
	Mail,
	ReceiptText,
	Save,
	ShieldCheck,
	User,
} from 'lucide-react'
import { motion } from 'motion/react'
import type { ChangeEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'
import { requestPhoneChange, verifyPhoneChange } from '../../lib/auth'
import {
	getCustomerProfile,
	requestCustomerEmailChange,
	updateCustomerProfile,
} from '../../lib/server/settings'
import type { CustomerProfile } from '../../types/settings'

export const Route = createFileRoute('/_portal/profile')({
	component: ProfilePage,
})

const EGYPT_MOBILE_REGEX = /^(10|11|12|15)\d{8}$/

function ProfilePage() {
	const { t } = useTranslation('portal')
	const queryClient = useQueryClient()
	const [companyName, setCompanyName] = useState('')
	const [emailDraft, setEmailDraft] = useState('')
	const [phoneDraft, setPhoneDraft] = useState('')
	const [otpCode, setOtpCode] = useState('')
	const [phoneStage, setPhoneStage] = useState<'idle' | 'code'>('idle')
	const [profileSaved, setProfileSaved] = useState(false)
	const [profileError, setProfileError] = useState<string | null>(null)
	const [phoneMessage, setPhoneMessage] = useState<{
		kind: 'success' | 'error'
		text: string
	} | null>(null)
	const [emailMessage, setEmailMessage] = useState<{
		kind: 'success' | 'error'
		text: string
	} | null>(null)

	const profileQuery = useQuery({
		queryKey: ['customerProfile'],
		queryFn: () => getCustomerProfile(),
	})

	const profile = profileQuery.data

	useEffect(() => {
		if (!profile) return
		setCompanyName(profile.companyName)
		setEmailDraft(
			profile.pendingEmail ?? profile.email ?? profile.authEmail ?? '',
		)
		setPhoneDraft(toLocalEgyptPhone(profile.phone))
		setOtpCode('')
		setPhoneStage('idle')
		setProfileSaved(false)
		setProfileError(null)
	}, [profile])

	const updateMutation = useMutation({
		mutationFn: () =>
			updateCustomerProfile({
				data: {
					companyName: companyName.trim(),
				},
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customerProfile'] })
			setProfileSaved(true)
			setProfileError(null)
			window.setTimeout(() => setProfileSaved(false), 1800)
		},
		onError: () => {
			setProfileError(t('profilePage.saveFailed'))
		},
	})

	const emailMutation = useMutation({
		mutationFn: (email: string) =>
			requestCustomerEmailChange({ data: { email } }),
		onSuccess: (result) => {
			if (result.success) {
				queryClient.invalidateQueries({ queryKey: ['customerProfile'] })
				setEmailMessage({
					kind: 'success',
					text:
						result.status === 'unchanged'
							? t('profilePage.emailAlreadyCurrent')
							: t('profilePage.emailConfirmationSent', {
									email: result.email ?? emailDraft.trim(),
								}),
				})
				return
			}
			setEmailMessage({
				kind: 'error',
				text: emailErrorLabel(result.error, t),
			})
		},
		onError: () => {
			setEmailMessage({
				kind: 'error',
				text: t('profilePage.emailChangeFailed'),
			})
		},
	})

	const requestPhoneMutation = useMutation({
		mutationFn: (phone: string) => requestPhoneChange({ data: { phone } }),
		onSuccess: (result) => {
			if (result.success) {
				setPhoneStage('code')
				setPhoneMessage({
					kind: 'success',
					text: t('profilePage.phoneCodeSent'),
				})
				return
			}
			setPhoneMessage({
				kind: 'error',
				text: phoneErrorLabel(result.error, t),
			})
		},
		onError: () => {
			setPhoneMessage({
				kind: 'error',
				text: t('profilePage.phoneChangeFailed'),
			})
		},
	})

	const verifyPhoneMutation = useMutation({
		mutationFn: (data: { phone: string; code: string }) =>
			verifyPhoneChange({ data }),
		onSuccess: (result) => {
			if (result.success) {
				queryClient.invalidateQueries({ queryKey: ['customerProfile'] })
				setOtpCode('')
				setPhoneStage('idle')
				setPhoneMessage({
					kind: 'success',
					text: t('profilePage.phoneChanged'),
				})
				return
			}
			setPhoneMessage({
				kind: 'error',
				text: phoneErrorLabel(result.error, t),
			})
		},
		onError: () => {
			setPhoneMessage({
				kind: 'error',
				text: t('profilePage.phoneChangeFailed'),
			})
		},
	})

	const hasProfileChanges = useMemo(() => {
		if (!profile) return false
		return companyName.trim() !== profile.companyName
	}, [companyName, profile])

	function handleProfileSave() {
		if (!profile || !hasProfileChanges || updateMutation.isPending) return
		if (!companyName.trim()) {
			setProfileError(t('profilePage.companyRequired'))
			return
		}
		setProfileSaved(false)
		setProfileError(null)
		updateMutation.mutate()
	}

	function handleEmailChange() {
		if (!profile || emailMutation.isPending) return
		const nextEmail = emailDraft.trim()
		if (!nextEmail) {
			setEmailMessage({
				kind: 'error',
				text: t('profilePage.emailRequired'),
			})
			return
		}
		setEmailMessage(null)
		emailMutation.mutate(nextEmail)
	}

	function handleRequestPhoneChange() {
		if (!profile || requestPhoneMutation.isPending) return
		const nextPhone = normalizeEgyptPhoneInput(phoneDraft)
		setPhoneDraft(nextPhone)
		if (!EGYPT_MOBILE_REGEX.test(nextPhone)) {
			setPhoneMessage({
				kind: 'error',
				text: t('profilePage.phoneInvalid'),
			})
			return
		}
		if (`+20${nextPhone}` === profile.phone) {
			setPhoneMessage({
				kind: 'error',
				text: t('profilePage.phoneSame'),
			})
			return
		}
		setPhoneMessage(null)
		requestPhoneMutation.mutate(nextPhone)
	}

	function handleVerifyPhoneChange() {
		const nextPhone = normalizeEgyptPhoneInput(phoneDraft)
		const code = otpCode.replace(/\D/g, '').slice(0, 6)
		setOtpCode(code)
		if (!EGYPT_MOBILE_REGEX.test(nextPhone)) {
			setPhoneMessage({
				kind: 'error',
				text: t('profilePage.phoneInvalid'),
			})
			return
		}
		if (code.length !== 6) {
			setPhoneMessage({
				kind: 'error',
				text: t('profilePage.phoneCodeInvalid'),
			})
			return
		}
		setPhoneMessage(null)
		verifyPhoneMutation.mutate({ phone: nextPhone, code })
	}

	if (profileQuery.isLoading) {
		return (
			<ProfileShell>
				<ProfileSkeleton />
			</ProfileShell>
		)
	}

	if (profileQuery.isError || !profile) {
		return (
			<ProfileShell>
				<div className="flex min-h-72 flex-col items-center justify-center text-center">
					<AlertTriangle
						size={28}
						strokeWidth={1.6}
						className="mb-3 text-[var(--p-text-faint)]"
					/>
					<p className="text-[14px] text-[var(--p-text-muted)]">
						{t('profilePage.loadFailed')}
					</p>
					<button
						type="button"
						onClick={() => profileQuery.refetch()}
						className="mt-4 h-10 rounded-xl border border-[var(--p-border)] px-4 text-[13px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
					>
						{t('orders.retry')}
					</button>
				</div>
			</ProfileShell>
		)
	}

	return (
		<ProfileShell>
			<section className="min-w-0">
				<div className="flex min-w-0 items-center gap-4 border-b border-[var(--p-border)] pb-5">
					<ProfileAvatar profile={profile} />
					<div className="min-w-0">
						<PortalTitleRow
							title={profile.companyName || t('profilePage.title')}
							subtitle={profile.contactName}
							className="max-w-full"
							showSidebarButton={false}
						/>
					</div>
				</div>

				<div className="mt-6 grid gap-5">
					<ProfileField
						label={t('profilePage.name')}
						value={profile.contactName}
						disabled
						icon={<LockKeyhole size={14} strokeWidth={1.7} />}
					/>
					<ProfileField
						label={t('profilePage.companyName')}
						value={companyName}
						onChange={(event) => {
							setCompanyName(event.currentTarget.value)
							setProfileSaved(false)
							setProfileError(null)
						}}
					/>
				</div>

				<div className="mt-6 flex flex-wrap items-center gap-3">
					<button
						type="button"
						onClick={handleProfileSave}
						disabled={!hasProfileChanges || updateMutation.isPending}
						className="flex h-11 min-w-36 items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-5 text-[13px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
					>
						{updateMutation.isPending ? (
							<Loader2 size={15} className="animate-spin" />
						) : (
							<Save size={15} strokeWidth={1.8} />
						)}
						<span>{t('profilePage.save')}</span>
					</button>
					{profileSaved && (
						<StatusText kind="success" text={t('profilePage.saved')} />
					)}
					{profileError && <StatusText kind="error" text={profileError} />}
				</div>

				<AccountSummary profile={profile} />

				<EmailChangePanel
					profile={profile}
					emailDraft={emailDraft}
					message={emailMessage}
					isPending={emailMutation.isPending}
					onEmailChange={(value) => {
						setEmailDraft(value)
						setEmailMessage(null)
					}}
					onRequest={handleEmailChange}
				/>

				<PhoneChangePanel
					currentPhone={profile.phone}
					phoneDraft={phoneDraft}
					otpCode={otpCode}
					stage={phoneStage}
					message={phoneMessage}
					isRequesting={requestPhoneMutation.isPending}
					isVerifying={verifyPhoneMutation.isPending}
					onPhoneChange={(value) => {
						setPhoneDraft(normalizeEgyptPhoneInput(value))
						setPhoneMessage(null)
					}}
					onOtpChange={(value) => {
						setOtpCode(value.replace(/\D/g, '').slice(0, 6))
						setPhoneMessage(null)
					}}
					onRequest={handleRequestPhoneChange}
					onVerify={handleVerifyPhoneChange}
				/>
			</section>
		</ProfileShell>
	)
}

function AccountSummary({ profile }: { profile: CustomerProfile }) {
	const { t } = useTranslation('portal')
	const creditLimit = new Intl.NumberFormat(undefined, {
		currency: 'EGP',
		maximumFractionDigits: 0,
		style: 'currency',
	}).format(profile.creditLimit)
	return (
		<section className="mt-8 grid gap-3 border-t border-[var(--p-border)] pt-6 sm:grid-cols-2 lg:grid-cols-4">
			<SummaryTile
				icon={<BadgeCheck size={16} strokeWidth={1.8} />}
				label={t('profilePage.status')}
				value={statusLabel(profile.status, t)}
			/>
			<SummaryTile
				icon={<ShieldCheck size={16} strokeWidth={1.8} />}
				label={t('profilePage.tier')}
				value={tierLabel(profile.tier, t)}
			/>
			<SummaryTile
				icon={<ReceiptText size={16} strokeWidth={1.8} />}
				label={t('profilePage.creditLimit')}
				value={creditLimit}
			/>
			<SummaryTile
				icon={<CalendarDays size={16} strokeWidth={1.8} />}
				label={t('profilePage.paymentHistory')}
				value={paymentLabel(profile.paymentHistory, t)}
			/>
		</section>
	)
}

function SummaryTile({
	icon,
	label,
	value,
}: {
	icon: ReactNode
	label: string
	value: string
}) {
	return (
		<div className="min-w-0 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-4">
			<div className="mb-3 text-[var(--p-text-muted)]">{icon}</div>
			<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--p-text-muted)]">
				{label}
			</p>
			<p className="mt-2 truncate text-[14px] font-semibold text-[var(--p-text)]">
				{value}
			</p>
		</div>
	)
}

function EmailChangePanel({
	profile,
	emailDraft,
	message,
	isPending,
	onEmailChange,
	onRequest,
}: {
	profile: CustomerProfile
	emailDraft: string
	message: { kind: 'success' | 'error'; text: string } | null
	isPending: boolean
	onEmailChange: (value: string) => void
	onRequest: () => void
}) {
	const { t } = useTranslation('portal')
	return (
		<section className="mt-8 border-t border-[var(--p-border)] pt-6">
			<div className="mb-4 flex items-start gap-3">
				<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--p-accent-dim)] text-[var(--p-accent)]">
					<Mail size={17} strokeWidth={1.8} />
				</span>
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-[14px] font-semibold text-[var(--p-text)]">
							{t('profilePage.emailAuthTitle')}
						</p>
						<AuthBadge profile={profile} />
					</div>
					<p className="mt-1 max-w-2xl text-[12px] leading-5 text-[var(--p-text-muted)]">
						{t('profilePage.emailAuthNotice')}
					</p>
					{profile.pendingEmail ? (
						<p className="mt-2 flex items-center gap-2 text-[12px] text-[var(--p-text-muted)]">
							<Clock size={14} strokeWidth={1.7} />
							{t('profilePage.pendingEmail', {
								email: profile.pendingEmail,
							})}
						</p>
					) : null}
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
				<ProfileField
					label={t('settings.profile.email')}
					value={emailDraft}
					type="email"
					onChange={(event) => onEmailChange(event.currentTarget.value)}
					placeholder={t('profilePage.emailPlaceholder')}
				/>
				<button
					type="button"
					onClick={onRequest}
					disabled={isPending}
					className="flex h-11 items-center justify-center gap-2 self-end rounded-xl border border-[var(--p-border)] px-4 text-[13px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-50"
				>
					{isPending ? (
						<Loader2 size={15} className="animate-spin" />
					) : (
						<Mail size={15} strokeWidth={1.8} />
					)}
					<span>{t('profilePage.sendEmailConfirmation')}</span>
				</button>
			</div>
			{message && <StatusText kind={message.kind} text={message.text} />}
		</section>
	)
}

function AuthBadge({ profile }: { profile: CustomerProfile }) {
	const { t } = useTranslation('portal')
	const label = profile.pendingEmail
		? t('profilePage.emailPending')
		: profile.emailConfirmed
			? t('profilePage.emailConfirmed')
			: t('profilePage.emailUnconfirmed')
	return (
		<span className="inline-flex min-h-6 items-center gap-1.5 rounded-full border border-[var(--p-border)] px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--p-text-muted)]">
			{profile.pendingEmail ? (
				<Clock size={12} strokeWidth={1.8} />
			) : profile.emailConfirmed ? (
				<ShieldCheck size={12} strokeWidth={1.8} />
			) : (
				<Mail size={12} strokeWidth={1.8} />
			)}
			{label}
		</span>
	)
}

function ProfileShell({ children }: { children: ReactNode }) {
	const { t } = useTranslation('portal')
	return (
		<div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--p-bg)]">
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.28, ease: 'easeOut' }}
				className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5 lg:px-8 lg:py-10"
			>
				<header className="mb-6 shrink-0">
					<PortalTitleRow
						title={t('profilePage.title')}
						subtitle={t('profilePage.subtitle')}
						fixed
					/>
				</header>
				{children}
			</motion.div>
		</div>
	)
}

function ProfileAvatar({ profile }: { profile: CustomerProfile }) {
	const initial = profile.contactName.trim().charAt(0).toUpperCase() || '?'
	return (
		<div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] text-[var(--p-text-muted)] sm:h-24 sm:w-24">
			{profile.profilePhotoUrl ? (
				<img
					src={profile.profilePhotoUrl}
					alt=""
					className="h-full w-full object-cover"
				/>
			) : initial !== '?' ? (
				<span className="text-2xl font-semibold">{initial}</span>
			) : (
				<User size={30} strokeWidth={1.4} />
			)}
		</div>
	)
}

function ProfileField({
	label,
	value,
	onChange,
	placeholder,
	disabled = false,
	type = 'text',
	icon,
}: {
	label: string
	value: string
	onChange?: (event: ChangeEvent<HTMLInputElement>) => void
	placeholder?: string
	disabled?: boolean
	type?: 'email' | 'tel' | 'text'
	icon?: ReactNode
}) {
	return (
		<label className="block">
			<span className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--p-text-muted)]">
				{icon}
				{label}
			</span>
			<input
				type={type}
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				disabled={disabled}
				className="h-11 w-full border-b border-[var(--p-border)] bg-transparent text-[15px] text-[var(--p-text)] outline-none transition-colors placeholder:text-[var(--p-text-faint)] focus:border-[var(--p-border-strong)] disabled:cursor-not-allowed disabled:text-[var(--p-text-faint)]"
			/>
		</label>
	)
}

function PhoneChangePanel({
	currentPhone,
	phoneDraft,
	otpCode,
	stage,
	message,
	isRequesting,
	isVerifying,
	onPhoneChange,
	onOtpChange,
	onRequest,
	onVerify,
}: {
	currentPhone: string
	phoneDraft: string
	otpCode: string
	stage: 'idle' | 'code'
	message: { kind: 'success' | 'error'; text: string } | null
	isRequesting: boolean
	isVerifying: boolean
	onPhoneChange: (value: string) => void
	onOtpChange: (value: string) => void
	onRequest: () => void
	onVerify: () => void
}) {
	const { t } = useTranslation('portal')
	return (
		<section className="mt-8 border-t border-[var(--p-border)] pt-6">
			<div className="mb-4 flex items-start gap-3">
				<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--p-accent-dim)] text-[var(--p-accent)]">
					<ShieldCheck size={17} strokeWidth={1.8} />
				</span>
				<div className="min-w-0">
					<p className="text-[14px] font-semibold text-[var(--p-text)]">
						{t('profilePage.phoneChangeTitle')}
					</p>
					<p className="mt-1 max-w-2xl text-[12px] leading-5 text-[var(--p-text-muted)]">
						{t('profilePage.phoneUsageNotice')}
					</p>
					<p className="mt-1 font-mono text-[12px] text-[var(--p-text-muted)]">
						{formatPhone(currentPhone)}
					</p>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
				<div className="flex h-11 min-w-0 items-center border-b border-[var(--p-border)] focus-within:border-[var(--p-border-strong)]">
					<span className="shrink-0 pe-3 font-mono text-[14px] text-[var(--p-text-muted)]">
						+20
					</span>
					<input
						type="tel"
						inputMode="numeric"
						value={phoneDraft}
						onChange={(event) => onPhoneChange(event.currentTarget.value)}
						placeholder="10xxxxxxxx"
						className="h-full min-w-0 flex-1 bg-transparent font-mono text-[15px] text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-faint)]"
						dir="ltr"
					/>
				</div>
				<button
					type="button"
					onClick={onRequest}
					disabled={isRequesting || isVerifying}
					className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] px-4 text-[13px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-50"
				>
					{isRequesting ? (
						<Loader2 size={15} className="animate-spin" />
					) : (
						<KeyRound size={15} strokeWidth={1.8} />
					)}
					<span>{t('profilePage.sendCode')}</span>
				</button>
			</div>

			{stage === 'code' && (
				<div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
					<input
						type="text"
						inputMode="numeric"
						value={otpCode}
						onChange={(event) => onOtpChange(event.currentTarget.value)}
						placeholder={t('profilePage.verificationCode')}
						className="h-11 min-w-0 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 font-mono text-[15px] tracking-[0.35em] text-[var(--p-text)] outline-none transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:text-[var(--p-text-faint)] focus:border-[var(--p-border-strong)]"
						dir="ltr"
					/>
					<button
						type="button"
						onClick={onVerify}
						disabled={isRequesting || isVerifying}
						className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-4 text-[13px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
					>
						{isVerifying ? (
							<Loader2 size={15} className="animate-spin" />
						) : (
							<Check size={15} strokeWidth={1.8} />
						)}
						<span>{t('profilePage.verifyPhone')}</span>
					</button>
				</div>
			)}

			{message && <StatusText kind={message.kind} text={message.text} />}
		</section>
	)
}

function StatusText({
	kind,
	text,
}: {
	kind: 'success' | 'error'
	text: string
}) {
	return (
		<p
			className={`flex min-h-7 items-center gap-2 text-[13px] font-medium ${kind === 'success' ? 'text-[var(--p-success)]' : 'text-[var(--p-error)]'}`}
		>
			{kind === 'success' ? (
				<Check size={14} strokeWidth={1.8} />
			) : (
				<AlertTriangle size={14} strokeWidth={1.8} />
			)}
			{text}
		</p>
	)
}

function ProfileSkeleton() {
	return (
		<div className="space-y-5">
			<div className="h-24 animate-pulse rounded-2xl bg-[var(--p-card)]" />
			{['a', 'b', 'c', 'd'].map((key) => (
				<div
					key={key}
					className="h-14 animate-pulse rounded-xl bg-[var(--p-card)]"
				/>
			))}
		</div>
	)
}

function normalizeEgyptPhoneInput(value: string) {
	return value
		.replace(/\D/g, '')
		.replace(/^0020/, '')
		.replace(/^20/, '')
		.replace(/^0/, '')
		.slice(0, 10)
}

function toLocalEgyptPhone(value: string) {
	return normalizeEgyptPhoneInput(value.replace(/^\+20/, ''))
}

function formatPhone(value: string) {
	const local = toLocalEgyptPhone(value)
	return local ? `+20 ${local}` : value
}

function phoneErrorLabel(error: string, t: TFunction<'portal'>) {
	const labels: Record<string, string> = {
		auth_mismatch: t('profilePage.phoneAuthMismatch'),
		invalid_code: t('profilePage.phoneCodeInvalid'),
		not_authenticated: t('profilePage.phoneAuthRequired'),
		phone_in_use: t('profilePage.phoneInUse'),
		rate_limited: t('login.rateLimit'),
		same_phone: t('profilePage.phoneSame'),
		send_failed: t('profilePage.phoneChangeFailed'),
		verify_failed: t('profilePage.phoneChangeFailed'),
	}
	return labels[error] ?? t('profilePage.phoneChangeFailed')
}

function emailErrorLabel(error: string | undefined, t: TFunction<'portal'>) {
	const labels: Record<string, string> = {
		not_authenticated: t('profilePage.emailAuthRequired'),
		update_failed: t('profilePage.emailChangeFailed'),
	}
	return labels[error ?? ''] ?? t('profilePage.emailChangeFailed')
}

function statusLabel(
	status: CustomerProfile['status'],
	t: TFunction<'portal'>,
) {
	const labels: Record<CustomerProfile['status'], string> = {
		active: t('profilePage.statusActive'),
		claimed: t('profilePage.statusClaimed'),
		inactive: t('profilePage.statusInactive'),
		unclaimed: t('profilePage.statusUnclaimed'),
	}
	return labels[status]
}

function tierLabel(tier: CustomerProfile['tier'], t: TFunction<'portal'>) {
	const labels: Record<CustomerProfile['tier'], string> = {
		A: t('profilePage.tierA'),
		B: t('profilePage.tierB'),
		C: t('profilePage.tierC'),
		new: t('profilePage.tierNew'),
	}
	return labels[tier]
}

function paymentLabel(
	paymentHistory: CustomerProfile['paymentHistory'],
	t: TFunction<'portal'>,
) {
	const labels: Record<CustomerProfile['paymentHistory'], string> = {
		excellent: t('profilePage.paymentExcellent'),
		fair: t('profilePage.paymentFair'),
		good: t('profilePage.paymentGood'),
		poor: t('profilePage.paymentPoor'),
	}
	return labels[paymentHistory]
}
