import { Package } from 'lucide-react'
import { useState } from 'react'
import { Toggle } from '../../ui/Toggle'
import { StatusTag, TextAreaControl, TextControl } from '../AdminControls'
import { Field, Section } from '../EntityEditor'
import { EditorTextField } from './volumeEditor'

function CatalogPictureField({
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

export function CatalogVisibilityField({
	label,
	visibleLabel,
	hiddenLabel,
	isVisible,
	onChange,
	readOnly,
}: {
	label: string
	visibleLabel: string
	hiddenLabel: string
	isVisible: boolean
	onChange: (checked: boolean) => void
	readOnly: boolean
}) {
	const displayLabel = isVisible ? visibleLabel : hiddenLabel
	return (
		<Field label={label}>
			{readOnly ? (
				<StatusTag
					label={displayLabel}
					tone={isVisible ? 'primary' : 'muted'}
				/>
			) : (
				<Toggle
					isSelected={isVisible}
					onChange={onChange}
					label={displayLabel}
					aria-label={label}
				/>
			)}
		</Field>
	)
}

interface CatalogLocalizedLabels {
	pictureUrl: string
	name: string
	nameAr: string
	description: string
	descriptionAr: string
	identitySection: string
}

type CatalogLocalizedPatch = Partial<{
	description: string
	description_ar: string
	name: string
	name_ar: string
	pictureUrl: string | null
}>

type CatalogLocalizedLabelKey =
	| 'editor.fields.description'
	| 'editor.fields.descriptionAr'
	| 'editor.fields.name'
	| 'editor.fields.nameAr'
	| 'editor.fields.pictureUrl'
	| 'editor.section.identity'

export function catalogLocalizedLabels(
	t: (key: CatalogLocalizedLabelKey) => string,
): CatalogLocalizedLabels {
	return {
		pictureUrl: t('editor.fields.pictureUrl'),
		name: t('editor.fields.name'),
		nameAr: t('editor.fields.nameAr'),
		description: t('editor.fields.description'),
		descriptionAr: t('editor.fields.descriptionAr'),
		identitySection: t('editor.section.identity'),
	}
}

export function CatalogIdentityFields({
	pictureUrl,
	name,
	nameAr,
	onPatch,
	readOnly,
	labels,
}: {
	pictureUrl: string | null
	name: string
	nameAr: string
	onPatch: (patch: CatalogLocalizedPatch) => void
	readOnly: boolean
	labels: Pick<
		CatalogLocalizedLabels,
		'pictureUrl' | 'name' | 'nameAr' | 'identitySection'
	>
}) {
	return (
		<>
			<CatalogPictureField
				value={pictureUrl}
				onChange={(value) => onPatch({ pictureUrl: value })}
				readOnly={readOnly}
				altText={name || labels.name}
				label={labels.pictureUrl}
			/>

			<Section title={labels.identitySection} />
			<EditorTextField
				label={labels.name}
				value={name}
				onChange={(value) => onPatch({ name: value })}
				readOnly={readOnly}
				required
			/>
			<EditorTextField
				label={labels.nameAr}
				value={nameAr}
				onChange={(value) => onPatch({ name_ar: value })}
				readOnly={readOnly}
				required
			/>
		</>
	)
}

export function CatalogDescriptionFields({
	description,
	descriptionAr,
	onPatch,
	readOnly,
	labels,
}: {
	description: string
	descriptionAr: string
	onPatch: (patch: CatalogLocalizedPatch) => void
	readOnly: boolean
	labels: Pick<CatalogLocalizedLabels, 'description' | 'descriptionAr'>
}) {
	return (
		<>
			<Field label={labels.description} required>
				<TextAreaControl
					value={description}
					onChange={(value) => onPatch({ description: value })}
					readOnly={readOnly}
					ariaLabel={labels.description}
					rows={3}
				/>
			</Field>
			<Field label={labels.descriptionAr} required>
				<TextAreaControl
					value={descriptionAr}
					onChange={(value) => onPatch({ description_ar: value })}
					readOnly={readOnly}
					ariaLabel={labels.descriptionAr}
					rows={3}
				/>
			</Field>
		</>
	)
}
