/**
 * Profile — clean, flat, scroll-safe on compact screens.
 */
import { createFileRoute } from '@tanstack/react-router'
import { Camera, Check, Loader2, User } from 'lucide-react'
import { motion } from 'motion/react'
import type { ChangeEvent } from 'react'
import { useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_portal/profile')({
	component: ProfilePage,
})

function ProfilePage() {
	const { t } = useTranslation('portal')
	const { auth } = Route.useRouteContext()

	const typedAuth = auth as {
		user?: {
			phone?: string
			user_metadata?: {
				name?: string
				company_name?: string
				tax_id?: string
				default_address?: string
				default_notes?: string
				avatar_url?: string | null
			}
		}
	} | null
	const user = typedAuth?.user
	const meta = user?.user_metadata ?? {}
	const fullName = meta.name ?? ''
	const phone = user?.phone ?? ''

	const [companyName, setCompanyName] = useState(meta.company_name ?? '')
	const [taxId, setTaxId] = useState(meta.tax_id ?? '')
	const [defaultAddress, setDefaultAddress] = useState(
		meta.default_address ?? '',
	)
	const [defaultNotes, setDefaultNotes] = useState(meta.default_notes ?? '')
	const [avatarUrl, setAvatarUrl] = useState<string | null>(
		meta.avatar_url ?? null,
	)
	const [hasChanges, setHasChanges] = useState(false)
	const [saving, setSaving] = useState(false)
	const [saved, setSaved] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		setAvatarUrl(URL.createObjectURL(file))
		setHasChanges(true)
	}

	const handleSave = async () => {
		setSaving(true)
		await new Promise((r) => setTimeout(r, 800))
		setSaving(false)
		setHasChanges(false)
		setSaved(true)
		setTimeout(() => setSaved(false), 2000)
	}

	const set =
		(fn: (v: string) => void) =>
		(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			fn(e.target.value)
			setHasChanges(true)
			setSaved(false)
		}

	return (
		<div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--p-bg)]">
			<motion.div
				initial={false}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="mx-auto flex min-h-full w-full max-w-[560px] flex-col justify-start px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+4.25rem)] sm:px-6 sm:pt-8 md:justify-center md:py-10 lg:max-w-[620px] lg:px-8"
			>
				{/* Avatar centered */}
				<div className="mb-6 flex flex-col items-center text-center sm:mb-8">
					<div className="relative mb-3 sm:mb-4">
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-full border border-[var(--p-border)] bg-[var(--p-card)] p-0 transition-colors hover:border-[var(--p-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--p-bg)] sm:h-24 sm:w-24"
							aria-label={t('profilePage.changePhoto')}
						>
							{avatarUrl ? (
								<img
									src={avatarUrl}
									alt=""
									className="h-full w-full object-cover"
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center">
									<User
										size={32}
										strokeWidth={0.8}
										className="text-[var(--p-text-muted)]"
									/>
								</div>
							)}
							<span className="absolute end-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--p-border)] bg-[var(--p-bg)] text-[var(--p-text-muted)] transition-colors group-hover:text-[var(--p-text)]">
								<Camera size={18} strokeWidth={1.5} />
							</span>
						</button>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							onChange={handleAvatarChange}
							className="hidden"
						/>
					</div>
					<h1 className="max-w-full break-words text-lg font-semibold tracking-normal text-[var(--p-text)] sm:text-xl">
						{fullName || t('profilePage.title')}
					</h1>
					{phone && (
						<p
							className="mt-1 font-mono text-[13px] tracking-normal text-[var(--p-text-muted)]"
							dir="ltr"
						>
							{phone}
						</p>
					)}
				</div>

				{/* Fields */}
				<div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:gap-5">
					<Field
						label={t('profilePage.companyName')}
						value={companyName}
						onChange={set(setCompanyName)}
					/>
					<Field
						label={t('profilePage.taxId')}
						value={taxId}
						onChange={set(setTaxId)}
						placeholder={t('profilePage.taxIdPlaceholder')}
						mono
					/>
					<Field
						label={t('profilePage.defaultAddress')}
						value={defaultAddress}
						onChange={set(setDefaultAddress)}
						placeholder={t('profilePage.addressPlaceholder')}
					/>
					<div>
						<span className="mb-1.5 block text-[13px] font-medium uppercase tracking-normal text-[var(--p-text-muted)]">
							{t('profilePage.defaultNotes')}
						</span>
						<textarea
							value={defaultNotes}
							onChange={set(setDefaultNotes)}
							rows={3}
							placeholder={t('profilePage.notesPlaceholder')}
							className="min-h-28 w-full resize-none border-b border-[var(--p-border)] bg-transparent py-2.5 text-[16px] leading-relaxed tracking-normal text-[var(--p-text)] outline-none transition-colors duration-300 placeholder:font-light placeholder:text-[var(--p-text-muted)]/40 focus:border-[var(--p-text-muted)] sm:min-h-24 sm:text-[15px]"
						/>
					</div>
				</div>

				{/* Save */}
				<div className="sticky bottom-0 -mx-4 flex min-h-16 items-center gap-3 border-t border-[var(--p-border)] bg-[var(--p-bg)]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:min-h-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
					<Button
						onPress={handleSave}
						isDisabled={!hasChanges || saving}
						className="flex h-11 w-full cursor-pointer items-center justify-center rounded-md bg-[var(--p-text)] px-8 text-[13px] font-medium text-[var(--p-bg)] transition-all hover:opacity-90 pressed:opacity-80 disabled:cursor-default disabled:opacity-20 sm:w-auto"
					>
						{saving ? (
							<Loader2 size={14} className="animate-spin" />
						) : (
							t('profilePage.save')
						)}
					</Button>
					{saved && (
						<motion.span
							initial={{ opacity: 0, x: -4 }}
							animate={{ opacity: 1, x: 0 }}
							className="flex shrink-0 items-center gap-1.5 text-[13px] text-[var(--p-success)]"
						>
							<Check size={12} />
							{t('profilePage.saved', 'Saved')}
						</motion.span>
					)}
				</div>
			</motion.div>
		</div>
	)
}

function Field({
	label,
	value,
	onChange,
	placeholder,
	mono,
}: {
	label: string
	value: string
	onChange: (e: ChangeEvent<HTMLInputElement>) => void
	placeholder?: string
	mono?: boolean
}) {
	return (
		<div>
			<span className="mb-1.5 block text-[13px] font-medium uppercase tracking-normal text-[var(--p-text-muted)]">
				{label}
			</span>
			<input
				type="text"
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				className={`min-h-11 w-full border-b border-[var(--p-border)] bg-transparent py-2.5 text-[16px] tracking-normal text-[var(--p-text)] outline-none transition-colors duration-300 placeholder:font-light placeholder:text-[var(--p-text-muted)]/40 focus:border-[var(--p-text-muted)] sm:text-[15px] ${mono ? 'font-mono' : ''}`}
			/>
		</div>
	)
}
