import type { CatalogProduct } from '@hyperquote/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	adminCreateProduct,
	adminDeleteProduct,
	adminListProducts,
	adminUpdateProduct,
} from '../../../lib/server/admin'
import { useAdminStore } from '../../../stores/admin'
import { getVolume } from '../../../types/admin'
import { Toggle } from '../../ui/Toggle'
import {
	LinkAction,
	NumberControl,
	SelectControl,
	StatusTag,
	TextAreaControl,
	TextControl,
} from '../AdminControls'
import { EntityEditor, Field, Section } from '../EntityEditor'
import { type ColumnDef, EntityIndex } from '../EntityIndex'
import { RegistryMasthead } from '../RegistryMasthead'

type ProductDraft = Omit<CatalogProduct, 'id'> & { id?: string }

function blankProduct(): ProductDraft {
	return {
		slug: '',
		sku: '',
		name: '',
		name_ar: '',
		description: '',
		description_ar: '',
		category: '',
		subcategory: '',
		brand: null,
		manufacturer: '',
		specifications: {},
		unit_of_measure: 'piece',
		weight_kg: 0,
		price_range_min: 0,
		price_range_max: 0,
		price_tier: 'budget',
		availability_status: 'available',
		tags: [],
		is_stockable: true,
		pictureUrl: null,
	}
}

export function ProductsVolume() {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const volume = getVolume('products')

	const mode = useAdminStore((s) => s.editorMode)
	const openEditor = useAdminStore((s) => s.openEditor)
	const closeEditor = useAdminStore((s) => s.closeEditor)

	const {
		data: products = [],
		isError: productsError,
		isPending: productsPending,
	} = useQuery({
		queryKey: ['admin', 'products'],
		queryFn: () => adminListProducts(),
	})

	const [draft, setDraft] = useState<ProductDraft | null>(null)

	function handleRowSelect(row: CatalogProduct) {
		setDraft({ ...row })
		openEditor('view', row.id)
	}

	function handleNew() {
		setDraft(blankProduct())
		openEditor('create', null)
	}

	function handleClose() {
		closeEditor()
		setDraft(null)
	}

	function handleEdit() {
		if (!draft?.id) return
		openEditor('edit', draft.id)
	}

	function handleCancel() {
		if (mode === 'create') {
			handleClose()
		} else if (draft?.id) {
			const original = products.find((p) => p.id === draft.id)
			if (original) setDraft({ ...original })
			openEditor('view', draft.id)
		}
	}

	const createMutation = useMutation({
		mutationFn: (payload: Omit<CatalogProduct, 'id'>) =>
			adminCreateProduct({
				data: {
					...payload,
					specifications: { ...payload.specifications },
					pictureUrl: payload.pictureUrl ?? null,
				},
			}),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'products'] })
			setDraft({ ...created })
			openEditor('view', created.id)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (
			payload: { id: string } & Partial<Omit<CatalogProduct, 'id'>>,
		) =>
			adminUpdateProduct({
				data: {
					...payload,
					...(payload.specifications
						? { specifications: { ...payload.specifications } }
						: {}),
				},
			}),
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'products'] })
			setDraft({ ...updated })
			openEditor('view', updated.id)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (id: string) => adminDeleteProduct({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['admin', 'products'] })
			handleClose()
		},
	})

	function handleSave() {
		if (!draft) return
		// Normalize optional fields before submit — the server expects a full payload.
		const payload: Omit<CatalogProduct, 'id'> = {
			slug: draft.slug,
			sku: draft.sku,
			name: draft.name,
			name_ar: draft.name_ar,
			description: draft.description,
			description_ar: draft.description_ar,
			category: draft.category,
			subcategory: draft.subcategory,
			brand: draft.brand,
			manufacturer: draft.manufacturer,
			specifications: draft.specifications,
			unit_of_measure: draft.unit_of_measure,
			weight_kg: draft.weight_kg,
			price_range_min: draft.price_range_min,
			price_range_max: draft.price_range_max,
			price_tier: draft.price_tier,
			availability_status: draft.availability_status,
			tags: draft.tags,
			is_stockable: draft.is_stockable,
			pictureUrl: draft.pictureUrl ?? null,
		}

		if (mode === 'create') {
			createMutation.mutate(payload)
		} else if (mode === 'edit' && draft.id) {
			updateMutation.mutate({ id: draft.id, ...payload })
		}
	}

	function handleDelete() {
		if (!draft?.id) return
		if (
			typeof window !== 'undefined' &&
			!window.confirm(t('actions.confirmDelete'))
		)
			return
		deleteMutation.mutate(draft.id)
	}

	const readOnly = mode === 'view'

	const priceTierOptions: Array<{
		value: CatalogProduct['price_tier']
		label: string
	}> = [
		{ value: 'budget', label: 'Budget' },
		{ value: 'mid_range', label: 'Mid-range' },
		{ value: 'premium', label: 'Premium' },
	]
	const availabilityOptions: Array<{
		value: CatalogProduct['availability_status']
		label: string
	}> = [
		{ value: 'available', label: 'Available' },
		{ value: 'low_stock', label: 'Low stock' },
		{ value: 'out_of_stock', label: 'Out of stock' },
	]

	const columns: ColumnDef<CatalogProduct>[] = [
		{
			key: 'thumb',
			labelKey: 'volumes.products.columns.thumb',
			width: '44px',
			mobileRole: 'media',
			render: (r) => <Thumbnail src={r.pictureUrl} alt={r.name} />,
		},
		{
			key: 'name',
			labelKey: 'volumes.products.columns.name',
			width: 'minmax(200px, 2fr)',
			mobileRole: 'primary',
			render: (r) => (
				<span className="break-words font-semibold text-[var(--color-text)]">
					{r.name}
				</span>
			),
		},
		{
			key: 'category',
			labelKey: 'volumes.products.columns.category',
			width: 'minmax(140px, 1fr)',
			mobileRole: 'detail',
			render: (r) => (
				<span className="break-words text-[var(--color-text-muted)]">
					{r.category}
				</span>
			),
		},
		{
			key: 'unit',
			labelKey: 'volumes.products.columns.unit',
			width: '90px',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.unit_of_measure}</>,
		},
		{
			key: 'sku',
			labelKey: 'volumes.products.columns.sku',
			width: '110px',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.sku}</>,
		},
		{
			key: 'price',
			labelKey: 'volumes.products.columns.price',
			width: 'minmax(140px, 1fr)',
			align: 'end',
			mono: true,
			mobileRole: 'detail',
			render: (r) => (
				<span>
					{r.price_range_min.toLocaleString()} –{' '}
					{r.price_range_max.toLocaleString()}
				</span>
			),
		},
	]

	const filter = (r: CatalogProduct, q: string) =>
		r.name.toLowerCase().includes(q) ||
		r.name_ar.includes(q) ||
		r.category.toLowerCase().includes(q) ||
		r.sku.toLowerCase().includes(q) ||
		r.slug.toLowerCase().includes(q)

	return (
		<>
			<RegistryMasthead volume={volume} entryCount={products.length} />
			<EntityIndex
				volume="products"
				rows={products}
				columns={columns}
				rowKey={(r) => r.id}
				onRowSelect={handleRowSelect}
				onNewEntry={handleNew}
				filter={filter}
				isLoading={productsPending}
				isError={productsError}
			/>

			<EntityEditor
				isOpen={mode !== null}
				onClose={handleClose}
				mode={mode}
				idLabel={draft?.id ?? null}
				footer={
					draft ? (
						<>
							<div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
								{mode === 'view' && (
									<LinkAction tone="primary" onClick={handleEdit}>
										{t('actions.edit')}
									</LinkAction>
								)}
								{(mode === 'edit' || mode === 'create') && (
									<LinkAction
										tone="primary"
										onClick={handleSave}
										disabled={
											createMutation.isPending || updateMutation.isPending
										}
									>
										{t('actions.save')}
									</LinkAction>
								)}
								{(mode === 'edit' || mode === 'create') && (
									<LinkAction onClick={handleCancel}>
										{t('actions.cancel')}
									</LinkAction>
								)}
							</div>
							{mode === 'view' && draft.id && (
								<LinkAction
									tone="danger"
									onClick={handleDelete}
									disabled={deleteMutation.isPending}
								>
									{t('actions.delete')}
								</LinkAction>
							)}
						</>
					) : null
				}
			>
				{draft && (
					<div className="space-y-6">
						{/* Picture preview + URL — sits above all other fields */}
						<PictureField
							value={draft.pictureUrl ?? null}
							onChange={(v) => setDraft({ ...draft, pictureUrl: v })}
							readOnly={readOnly}
							altText={draft.name || t('editor.fields.name')}
							label={t('editor.fields.pictureUrl')}
						/>

						<Section title={t('editor.section.identity')} />
						<Field label={t('editor.fields.name')} required>
							<TextControl
								value={draft.name}
								onChange={(v) => setDraft({ ...draft, name: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.name')}
							/>
						</Field>
						<Field label={t('editor.fields.nameAr')}>
							<TextControl
								value={draft.name_ar}
								onChange={(v) => setDraft({ ...draft, name_ar: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.nameAr')}
							/>
						</Field>
						<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
							<Field label={t('editor.fields.sku')} required>
								<TextControl
									value={draft.sku}
									onChange={(v) => setDraft({ ...draft, sku: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.sku')}
								/>
							</Field>
							<Field label={t('editor.fields.slug')} required>
								<TextControl
									value={draft.slug}
									onChange={(v) => setDraft({ ...draft, slug: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.slug')}
								/>
							</Field>
						</div>

						<Section title={t('editor.section.taxonomy')} />
						<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
							<Field label={t('editor.fields.category')} required>
								<TextControl
									value={draft.category}
									onChange={(v) => setDraft({ ...draft, category: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.category')}
								/>
							</Field>
							<Field label={t('editor.fields.subcategory')}>
								<TextControl
									value={draft.subcategory}
									onChange={(v) => setDraft({ ...draft, subcategory: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.subcategory')}
								/>
							</Field>
							<Field label={t('editor.fields.brand')}>
								<TextControl
									value={draft.brand ?? ''}
									onChange={(v) => setDraft({ ...draft, brand: v || null })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.brand')}
								/>
							</Field>
							<Field label={t('editor.fields.manufacturer')}>
								<TextControl
									value={draft.manufacturer}
									onChange={(v) => setDraft({ ...draft, manufacturer: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.manufacturer')}
								/>
							</Field>
						</div>

						<Section title={t('editor.section.commercial')} />
						<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
							<Field label={t('editor.fields.priceRangeMin')}>
								<NumberControl
									value={draft.price_range_min}
									onChange={(v) => setDraft({ ...draft, price_range_min: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.priceRangeMin')}
									min={0}
									suffix="EGP"
								/>
							</Field>
							<Field label={t('editor.fields.priceRangeMax')}>
								<NumberControl
									value={draft.price_range_max}
									onChange={(v) => setDraft({ ...draft, price_range_max: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.priceRangeMax')}
									min={0}
									suffix="EGP"
								/>
							</Field>
							<Field label={t('editor.fields.priceTier')}>
								<SelectControl
									value={draft.price_tier}
									onChange={(v) => setDraft({ ...draft, price_tier: v })}
									options={priceTierOptions}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.priceTier')}
								/>
							</Field>
							<Field label={t('editor.fields.availabilityStatus')}>
								{readOnly ? (
									<div>
										<StatusTag
											label={draft.availability_status}
											tone={
												draft.availability_status === 'available'
													? 'primary'
													: draft.availability_status === 'low_stock'
														? 'neutral'
														: 'muted'
											}
										/>
									</div>
								) : (
									<SelectControl
										value={draft.availability_status}
										onChange={(v) =>
											setDraft({ ...draft, availability_status: v })
										}
										options={availabilityOptions}
										readOnly={false}
										ariaLabel={t('editor.fields.availabilityStatus')}
									/>
								)}
							</Field>
						</div>

						<Section title={t('editor.section.specifications')} />
						<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
							<Field label={t('editor.fields.unitOfMeasure')} required>
								<TextControl
									value={draft.unit_of_measure}
									onChange={(v) => setDraft({ ...draft, unit_of_measure: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.unitOfMeasure')}
								/>
							</Field>
							<Field label={t('editor.fields.weightKg')}>
								<NumberControl
									value={draft.weight_kg}
									onChange={(v) => setDraft({ ...draft, weight_kg: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.weightKg')}
									min={0}
									step={0.1}
									suffix="kg"
								/>
							</Field>
						</div>
						<Field label={t('editor.fields.isStockable')}>
							{readOnly ? (
								<span className="block font-[family-name:var(--font-archivo)] text-[14px] text-[var(--color-text)]">
									{draft.is_stockable ? '✓' : '—'}
								</span>
							) : (
								<Toggle
									isSelected={draft.is_stockable}
									onChange={(checked) =>
										setDraft({ ...draft, is_stockable: checked })
									}
									aria-label={t('editor.fields.isStockable')}
								/>
							)}
						</Field>

						<Field label={t('editor.fields.description')}>
							<TextAreaControl
								value={draft.description}
								onChange={(v) => setDraft({ ...draft, description: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.description')}
								rows={3}
							/>
						</Field>
						<Field label={t('editor.fields.descriptionAr')}>
							<TextAreaControl
								value={draft.description_ar}
								onChange={(v) => setDraft({ ...draft, description_ar: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.descriptionAr')}
								rows={3}
							/>
						</Field>

						<Field label={t('editor.fields.tags')}>
							<TextControl
								value={draft.tags.join(', ')}
								onChange={(v) =>
									setDraft({
										...draft,
										tags: v
											.split(',')
											.map((tag) => tag.trim())
											.filter(Boolean),
									})
								}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.tags')}
								placeholder="tag, tag, tag"
							/>
						</Field>
					</div>
				)}
			</EntityEditor>
		</>
	)
}

// ─── Picture field ─────────────────────────────────────────

function PictureField({
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
			{/* Preview — aspect-ratio locked so the layout never jumps */}
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
						className="absolute inset-0 w-full h-full object-cover"
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

			{/* URL input — switches to readonly text in view mode */}
			<div className="block">
				<span className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text-muted)]">
					{label}
				</span>
				<div className="block mt-1.5">
					<TextControl
						value={value ?? ''}
						onChange={(v) => {
							setFailed(false)
							onChange(v.trim() ? v : null)
						}}
						readOnly={readOnly}
						ariaLabel={label}
						placeholder="https://…"
					/>
				</div>
			</div>
		</div>
	)
}

function Thumbnail({
	src,
	alt,
}: {
	src: string | null | undefined
	alt: string
}) {
	const [failed, setFailed] = useState(false)
	if (!src || failed) {
		return (
			<span className="inline-flex items-center justify-center w-7 h-7 rounded-sm border border-[var(--color-border)] bg-black/[0.03] dark:bg-white/[0.03] text-[var(--color-text-subtle)]">
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
			className="w-7 h-7 rounded-sm object-cover border border-[var(--color-border)]"
		/>
	)
}
