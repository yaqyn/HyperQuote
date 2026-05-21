import { Package } from 'lucide-react'
import { useState } from 'react'
import { TextControl } from '../AdminControls'

export function CatalogPictureField({
	value,
	onChange,
	readOnly,
	altText,
	label,
}: {
	value: string | null
	onChange: (v: string | null) => void
	readOnly: boolean
	altText: string
	label: string
}) {
	const [failed, setFailed] = useState(false)
	const hasUrl = Boolean(value?.trim())

	return (
		<div className="space-y-3">
			<div
				className="relative overflow-hidden rounded-md border border-[var(--color-border)] bg-black/[0.02] dark:bg-white/[0.02]"
				style={{ aspectRatio: '16 / 9' }}
			>
				{hasUrl && !failed && value ? (
					<img
						src={value}
						alt={altText}
						loading="lazy"
						decoding="async"
						onError={() => setFailed(true)}
						onLoad={() => setFailed(false)}
						className="absolute inset-0 h-full w-full object-cover"
					/>
				) : (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--color-text-subtle)]">
						<Package size={22} strokeWidth={1.5} />
						<span className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.11em]">
							{failed ? 'unreachable' : 'no image'}
						</span>
					</div>
				)}
			</div>

			<div className="block">
				<span className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text-muted)]">
					{label}
				</span>
				<div className="mt-1.5 block">
					<TextControl
						value={value ?? ''}
						onChange={(v) => {
							setFailed(false)
							onChange(v.trim() ? v : null)
						}}
						readOnly={readOnly}
						ariaLabel={label}
						placeholder="https://..."
					/>
				</div>
			</div>
		</div>
	)
}

export function CatalogThumbnail({
	src,
	alt,
}: {
	src: string | null | undefined
	alt: string
}) {
	const [failed, setFailed] = useState(false)
	if (!src || failed) {
		return (
			<span className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--color-border)] bg-black/[0.03] text-[var(--color-text-subtle)] dark:bg-white/[0.03]">
				<Package size={12} strokeWidth={1.5} />
			</span>
		)
	}
	return (
		<img
			src={src}
			alt={alt}
			loading="lazy"
			decoding="async"
			onError={() => setFailed(true)}
			className="h-7 w-7 rounded-sm border border-[var(--color-border)] object-cover"
		/>
	)
}
