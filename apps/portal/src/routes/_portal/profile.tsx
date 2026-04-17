/**
 * Profile — clean, flat, vertically centered, no containers.
 */
import { createFileRoute } from '@tanstack/react-router'
import { Camera, Check, Loader2, User } from 'lucide-react'
import { motion } from 'motion/react'
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
	const fullName = meta.name ?? 'Dev User'
	const phone = user?.phone ?? '+20 100 000 0000'

	const [companyName, setCompanyName] = useState(meta.company_name ?? 'Dev Co')
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

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			fn(e.target.value)
			setHasChanges(true)
			setSaved(false)
		}

	return (
		<div className="flex-1 flex items-center justify-center h-full min-h-0 overflow-auto p-6 max-md:p-4">
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="w-full max-w-[520px]"
			>
				{/* Avatar centered */}
				<div className="flex flex-col items-center mb-8">
					<div className="relative mb-4">
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="relative overflow-hidden bg-[var(--p-card)] border border-[var(--p-border)] hover:border-[var(--p-border-strong)] transition-colors cursor-pointer group p-0"
							style={{ width: 96, height: 96, borderRadius: '50%' }}
						>
							{avatarUrl ? (
								<img
									src={avatarUrl}
									alt=""
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center">
									<User
										size={36}
										strokeWidth={0.8}
										className="text-[var(--p-text-muted)]"
									/>
								</div>
							)}
							<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full">
								<Camera size={18} strokeWidth={1.5} className="text-white/90" />
							</div>
						</button>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							onChange={handleAvatarChange}
							className="hidden"
						/>
					</div>
					<h1 className="text-xl font-semibold tracking-tight text-[var(--p-text)]">
						{fullName}
					</h1>
					<p
						className="text-[13px] font-mono text-[var(--p-text-muted)] mt-1 tracking-wide"
						dir="ltr"
					>
						{phone}
					</p>
				</div>

				{/* Fields */}
				<div className="flex flex-col gap-5 mb-10">
					<Field
						label={t('profilePage.companyName')}
						value={companyName}
						onChange={set(setCompanyName)}
					/>
					<Field
						label={t('profilePage.taxId')}
						value={taxId}
						onChange={set(setTaxId)}
						mono
					/>
					<Field
						label={t('profilePage.defaultAddress')}
						value={defaultAddress}
						onChange={set(setDefaultAddress)}
					/>
					<div>
						<span className="mb-2 block text-[13px] font-medium uppercase tracking-[0.15em] text-[var(--p-text-muted)]">
							{t('profilePage.defaultNotes')}
						</span>
						<textarea
							value={defaultNotes}
							onChange={set(setDefaultNotes)}
							rows={3}
							className="w-full bg-transparent border-b border-[var(--p-border)] py-2.5 text-[15px] tracking-[-0.01em] leading-relaxed text-[var(--p-text)] outline-none focus:border-[var(--p-text-muted)] transition-colors duration-300 resize-none placeholder:text-[var(--p-text-muted)]/40 placeholder:font-light"
						/>
					</div>
				</div>

				{/* Save */}
				<div className="flex items-center gap-3">
					<Button
						onPress={handleSave}
						isDisabled={!hasChanges || saving}
						className="flex h-10 items-center justify-center px-8 rounded-xl bg-[var(--p-text)] text-[13px] font-medium text-[var(--p-bg)] transition-all hover:opacity-90 pressed:opacity-80 cursor-pointer disabled:opacity-20 disabled:cursor-default"
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
							className="flex items-center gap-1.5 text-[13px] text-[var(--p-success)]"
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
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
	placeholder?: string
	mono?: boolean
}) {
	return (
		<div>
			<span className="mb-2 block text-[13px] font-medium uppercase tracking-[0.15em] text-[var(--p-text-muted)]">
				{label}
			</span>
			<input
				type="text"
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				className={`w-full bg-transparent border-b border-[var(--p-border)] py-2.5 text-[15px] tracking-[-0.01em] text-[var(--p-text)] outline-none focus:border-[var(--p-text-muted)] transition-colors duration-300 placeholder:text-[var(--p-text-muted)]/40 placeholder:font-light ${mono ? 'font-mono tracking-wider' : ''}`}
			/>
		</div>
	)
}
