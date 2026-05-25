/**
 * Profile settings section.
 * "Data is the design" — underline inputs, 11px uppercase labels, no decoration.
 * Phone read-only monospace. Profile photo 48px circle. Trade license minimal upload.
 * Save button dark bg, only when dirty.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import {
	AlertTriangle,
	Check,
	Clock,
	KeyRound,
	Mail,
	ShieldCheck,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { FileTrigger } from 'react-aria-components/FileTrigger'
import { Input } from 'react-aria-components/Input'
import { Label } from 'react-aria-components/Label'
import { TextField } from 'react-aria-components/TextField'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
	requestCustomerEmailChange,
	updateCustomerProfile,
	uploadProfilePhoto,
	uploadTradeLicense,
} from '../../lib/server/settings'
import type { CustomerProfile } from '../../types/settings'

interface ProfileSectionProps {
	profile: CustomerProfile
}

interface ProfileFormValues {
	companyName: string
}

const labelClass =
	'text-[13px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]'

const underlineInputClass =
	'w-full bg-transparent border-0 border-b border-[var(--color-border)] py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[#2563EB] placeholder:text-[var(--color-text-subtle)]'

export function ProfileSection({ profile }: ProfileSectionProps) {
	const { t } = useTranslation('portal')
	const queryClient = useQueryClient()

	const { control, handleSubmit, reset } = useForm<ProfileFormValues>({
		defaultValues: {
			companyName: profile.companyName,
		},
	})

	const watchedValues = useWatch({ control })

	const hasChanges = watchedValues.companyName !== profile.companyName

	const updateMutation = useMutation({
		mutationFn: (data: ProfileFormValues) => updateCustomerProfile({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customerProfile'] })
			reset(watchedValues as ProfileFormValues)
		},
	})

	const [emailDraft, setEmailDraft] = useState(
		profile.pendingEmail ?? profile.email ?? profile.authEmail ?? '',
	)
	const [emailPasswordDraft, setEmailPasswordDraft] = useState('')
	const [emailMessage, setEmailMessage] = useState<{
		kind: 'success' | 'error'
		text: string
	} | null>(null)
	const emailMutation = useMutation({
		mutationFn: (input: { email: string; password?: string }) =>
			requestCustomerEmailChange({ data: input }),
		onSuccess: (result) => {
			if (result.success) {
				queryClient.invalidateQueries({ queryKey: ['customerProfile'] })
				setEmailPasswordDraft('')
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

	const licenseMutation = useMutation({
		mutationFn: (fileUrl: string) => uploadTradeLicense({ data: { fileUrl } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customerProfile'] })
		},
	})

	const photoMutation = useMutation({
		mutationFn: (fileUrl: string) => uploadProfilePhoto({ data: { fileUrl } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customerProfile'] })
		},
	})

	const [photoPreview, setPhotoPreview] = useState<string | undefined>(
		profile.profilePhotoUrl,
	)

	useEffect(() => {
		setEmailDraft(
			profile.pendingEmail ?? profile.email ?? profile.authEmail ?? '',
		)
		if (profile.emailConfirmed) setEmailPasswordDraft('')
		setPhotoPreview(profile.profilePhotoUrl)
	}, [profile])

	const onSubmit = handleSubmit((data) => {
		updateMutation.mutate(data)
	})

	function handleEmailChange() {
		const nextEmail = emailDraft.trim()
		const requiresPassword = shouldRequireEmailPassword(profile)
		if (!nextEmail) {
			setEmailMessage({
				kind: 'error',
				text: t('profilePage.emailRequired'),
			})
			return
		}
		if (requiresPassword && emailPasswordDraft.length < 6) {
			setEmailMessage({
				kind: 'error',
				text: t('profilePage.emailPasswordRequired'),
			})
			return
		}
		setEmailMessage(null)
		emailMutation.mutate({
			email: nextEmail,
			...(requiresPassword ? { password: emailPasswordDraft } : {}),
		})
	}

	function handleLicenseSelect(files: FileList | null) {
		if (!files || files.length === 0) return
		const file = files[0]
		if (file.size > 5 * 1024 * 1024) return
		const url = URL.createObjectURL(file)
		licenseMutation.mutate(url)
	}

	function handlePhotoSelect(files: FileList | null) {
		if (!files || files.length === 0) return
		const file = files[0]
		if (file.size > 2 * 1024 * 1024) return
		const url = URL.createObjectURL(file)
		setPhotoPreview(url)
		photoMutation.mutate(url)
	}

	return (
		<div className="space-y-8">
			{/* Profile Photo */}
			<div className="flex items-center gap-4">
				<FileTrigger
					acceptedFileTypes={['image/jpeg', 'image/png']}
					onSelect={handlePhotoSelect}
				>
					<Button className="relative w-12 h-12 rounded-full border border-[var(--color-border)] overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2">
						{photoPreview ? (
							<img
								src={photoPreview}
								alt={t('settings.profile.photo')}
								className="w-full h-full object-cover"
							/>
						) : (
							<span className="flex items-center justify-center w-full h-full text-sm text-[var(--color-text-subtle)]">
								{profile.contactName?.charAt(0)?.toUpperCase() ?? '?'}
							</span>
						)}
					</Button>
				</FileTrigger>
				<div>
					<p className="text-[13px] text-[var(--color-text-subtle)]">
						JPG, PNG. {t('settings.profile.maxSize', { size: '2MB' })}
					</p>
				</div>
			</div>

			<form onSubmit={onSubmit} className="space-y-6">
				{/* Company Name */}
				<Controller
					name="companyName"
					control={control}
					render={({ field }) => (
						<TextField
							value={field.value}
							onChange={field.onChange}
							className="space-y-1.5"
						>
							<Label className={labelClass}>
								{t('settings.profile.companyName')}
							</Label>
							<Input className={underlineInputClass} />
						</TextField>
					)}
				/>

				{/* Contact Name */}
				<div className="space-y-1.5">
					<span className={labelClass}>
						{t('settings.profile.contactName')}
					</span>
					<div className="border-b border-[var(--color-border)] py-2">
						<span className="text-sm text-[var(--color-text-subtle)]">
							{profile.contactName}
						</span>
					</div>
				</div>

				{/* Phone (read-only) */}
				<div className="space-y-1.5">
					<span className={labelClass}>{t('settings.profile.phone')}</span>
					<div className="border-b border-[var(--color-border)] py-2">
						<span className="font-mono text-sm text-[var(--color-text)]">
							{profile.phone}
						</span>
					</div>
					<p className="text-[13px] text-[var(--color-text-subtle)]">
						{t('settings.profile.phoneNote')}
					</p>
				</div>

				{/* Save button — only when dirty */}
				<AnimatePresence>
					{hasChanges && (
						<motion.div
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 4 }}
							transition={{ duration: 0.2, ease: 'easeOut' }}
						>
							<Button
								type="submit"
								isDisabled={updateMutation.isPending}
								className="px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-50"
							>
								{updateMutation.isPending
									? t('settings.saving')
									: t('settings.saveChanges')}
							</Button>
						</motion.div>
					)}
				</AnimatePresence>
			</form>

			{/* Email authentication */}
			<div className="space-y-4 border-t border-[var(--color-border)] pt-6">
				<div className="flex items-start justify-between gap-4">
					<div>
						<span className={labelClass}>
							{t('profilePage.emailAuthTitle')}
						</span>
						<p className="mt-2 max-w-xl text-[13px] leading-5 text-[var(--color-text-subtle)]">
							{t('profilePage.emailAuthNotice')}
						</p>
					</div>
					<AuthStateBadge profile={profile} />
				</div>
				<div
					className={
						shouldRequireEmailPassword(profile)
							? 'grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'
							: 'grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]'
					}
				>
					<TextField
						value={emailDraft}
						onChange={(value) => {
							setEmailDraft(value)
							setEmailMessage(null)
						}}
						type="email"
						className="space-y-1.5"
					>
						<Label className={labelClass}>{t('settings.profile.email')}</Label>
						<Input
							className={underlineInputClass}
							placeholder={t('profilePage.emailPlaceholder')}
						/>
					</TextField>
					{shouldRequireEmailPassword(profile) ? (
						<TextField
							value={emailPasswordDraft}
							onChange={(value) => {
								setEmailPasswordDraft(value)
								setEmailMessage(null)
							}}
							type="password"
							className="space-y-1.5"
						>
							<Label className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<KeyRound size={13} strokeWidth={1.8} />
									{t('profilePage.emailPasswordLabel')}
								</span>
							</Label>
							<Input
								className={underlineInputClass}
								placeholder={t('profilePage.emailPasswordPlaceholder')}
							/>
						</TextField>
					) : null}
					<Button
						type="button"
						onPress={handleEmailChange}
						isDisabled={emailMutation.isPending}
						className="self-end px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-50"
					>
						{emailMutation.isPending
							? t('settings.saving')
							: t('profilePage.sendEmailConfirmation')}
					</Button>
				</div>
				{profile.pendingEmail && (
					<p className="flex items-center gap-2 text-[13px] text-[var(--color-text-subtle)]">
						<Clock size={14} strokeWidth={1.7} />
						{t('profilePage.pendingEmail', { email: profile.pendingEmail })}
					</p>
				)}
				{emailMessage && (
					<StatusMessage kind={emailMessage.kind} text={emailMessage.text} />
				)}
			</div>

			{/* Account summary */}
			<div className="grid gap-3 border-t border-[var(--color-border)] pt-6 sm:grid-cols-2">
				<AccountDatum
					label={t('profilePage.status')}
					value={statusLabel(profile.status, t)}
				/>
				<AccountDatum
					label={t('profilePage.tier')}
					value={tierLabel(profile.tier, t)}
				/>
				<AccountDatum
					label={t('profilePage.creditLimit')}
					value={new Intl.NumberFormat(undefined, {
						currency: 'EGP',
						maximumFractionDigits: 0,
						style: 'currency',
					}).format(profile.creditLimit)}
				/>
				<AccountDatum
					label={t('profilePage.paymentHistory')}
					value={paymentLabel(profile.paymentHistory, t)}
				/>
			</div>

			{/* Trade License */}
			<div className="space-y-3 pt-6 border-t border-[var(--color-border)]">
				<div className="flex items-center justify-between">
					<span className={labelClass}>
						{t('settings.profile.tradeLicense')}
					</span>
					<TradeLicenseBadge status={profile.tradeLicenseStatus} />
				</div>

				<FileTrigger
					acceptedFileTypes={['application/pdf', 'image/jpeg']}
					onSelect={handleLicenseSelect}
				>
					<Button className="w-full py-6 border border-dashed border-[var(--color-border)] text-[13px] text-[var(--color-text-subtle)] hover:border-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors">
						{t('settings.profile.uploadLicense')}
					</Button>
				</FileTrigger>
				<p className="text-[13px] text-[var(--color-text-subtle)]">
					PDF, JPG. {t('settings.profile.maxSize', { size: '5MB' })}
				</p>
			</div>
		</div>
	)
}

function AuthStateBadge({ profile }: { profile: CustomerProfile }) {
	const { t } = useTranslation('portal')
	if (profile.pendingEmail) {
		return (
			<span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
				<Clock size={13} strokeWidth={1.8} />
				{t('profilePage.emailPending')}
			</span>
		)
	}
	return (
		<span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
			{profile.emailConfirmed ? (
				<ShieldCheck size={13} strokeWidth={1.8} />
			) : (
				<Mail size={13} strokeWidth={1.8} />
			)}
			{profile.emailConfirmed
				? t('profilePage.emailConfirmed')
				: t('profilePage.emailUnconfirmed')}
		</span>
	)
}

function AccountDatum({ label, value }: { label: string; value: string }) {
	return (
		<div className="border border-[var(--color-border)] p-3">
			<p className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
				{label}
			</p>
			<p className="mt-2 text-sm font-medium text-[var(--color-text)]">
				{value}
			</p>
		</div>
	)
}

function StatusMessage({
	kind,
	text,
}: {
	kind: 'success' | 'error'
	text: string
}) {
	return (
		<p
			className={`flex items-center gap-2 text-[13px] ${kind === 'success' ? 'text-[var(--p-success)]' : 'text-[var(--p-error)]'}`}
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

function TradeLicenseBadge({
	status,
}: {
	status: CustomerProfile['tradeLicenseStatus']
}) {
	const { t } = useTranslation('portal')

	const labels: Record<string, string> = {
		verified: t('settings.profile.verified'),
		under_review: t('settings.profile.underReview'),
	}

	const label = labels[status] ?? t('settings.profile.notUploaded')

	return (
		<span className="text-[13px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
			{label}
		</span>
	)
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

function emailErrorLabel(error: string | undefined, t: TFunction<'portal'>) {
	const labels: Record<string, string> = {
		not_authenticated: t('profilePage.emailAuthRequired'),
		password_required: t('profilePage.emailPasswordRequired'),
		update_failed: t('profilePage.emailChangeFailed'),
	}
	return labels[error ?? ''] ?? t('profilePage.emailChangeFailed')
}

function shouldRequireEmailPassword(profile: CustomerProfile) {
	return !profile.emailConfirmed
}
