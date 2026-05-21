import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
	type AdminPricingRuleRow,
	adminCreatePricingRule,
	adminDeletePricingRule,
	adminListCategories,
	adminListPricingRules,
	adminListProducts,
	adminUpdatePricingRule,
} from '../../../lib/server/admin'
import { getVolume } from '../../../types/admin'
import { Toggle } from '../../ui/Toggle'
import { NumberControl, SelectControl, StatusTag } from '../AdminControls'
import { EntityEditor, Field, Section } from '../EntityEditor'
import { type ColumnDef, EntityIndex } from '../EntityIndex'
import { RegistryMasthead } from '../RegistryMasthead'
import { useAdminExport } from './useAdminExport'
import { useVolumeEditor, VolumeEditorFooter } from './volumeEditor'

type PricingRuleDraft = Omit<
	AdminPricingRuleRow,
	'id' | 'createdAt' | 'updatedAt' | 'updatedByEmployeeId' | 'absoluteMinMargin'
> & {
	id?: string
	createdAt?: string
	updatedAt?: string
	updatedByEmployeeId?: string | null
	absoluteMinMargin?: number
}

interface PricingRulesVolumeProps {
	onOpenVolumes: () => void
}

const ALL_SCOPE = '__all__'

function blankPricingRule(): PricingRuleDraft {
	return {
		categorySlug: null,
		productSlug: null,
		productCategory: '',
		bonusMargin: 20,
		targetMargin: 20,
		floorMargin: 20,
		active: true,
	}
}

export function PricingRulesVolume({ onOpenVolumes }: PricingRulesVolumeProps) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const volume = getVolume('pricingRules')
	const { exportStatus, isExporting, requestExport } =
		useAdminExport('pricing_rules')

	const {
		data: rules = [],
		isError,
		isPending,
	} = useQuery({
		queryKey: ['admin', 'pricingRules'],
		queryFn: () => adminListPricingRules(),
	})
	const { data: categories = [] } = useQuery({
		queryKey: ['admin', 'categories'],
		queryFn: () => adminListCategories(),
	})
	const { data: products = [] } = useQuery({
		queryKey: ['admin', 'products'],
		queryFn: () => adminListProducts(),
	})

	const {
		mode,
		draft,
		setDraft,
		readOnly,
		handleRowSelect,
		handleNew,
		handleClose,
		handleEdit,
		handleCancel,
		showSavedDraft,
	} = useVolumeEditor({
		rows: rules,
		blankDraft: blankPricingRule,
		rowToDraft: (row) => ({ ...row }),
		rowId: (row) => row.id,
		draftId: (row) => row.id,
	})

	const createMutation = useMutation({
		mutationFn: (payload: PricingRuleDraft) =>
			adminCreatePricingRule({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'pricingRules'] })
			showSavedDraft({ ...created }, created.id)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (payload: PricingRuleDraft) => {
			if (!payload.id) throw new Error('Pricing rule id is required')
			return adminUpdatePricingRule({ data: { ...payload, id: payload.id } })
		},
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'pricingRules'] })
			showSavedDraft({ ...updated }, updated.id)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (id: string) => adminDeletePricingRule({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['admin', 'pricingRules'] })
			handleClose()
		},
	})

	function payloadFromDraft(value: PricingRuleDraft): PricingRuleDraft {
		return {
			id: value.id,
			categorySlug: value.categorySlug,
			productSlug: value.productSlug,
			productCategory: scopeKey(value.categorySlug, value.productSlug),
			bonusMargin: value.bonusMargin,
			targetMargin: value.targetMargin,
			floorMargin: value.floorMargin,
			absoluteMinMargin: value.floorMargin,
			active: value.active,
		}
	}

	function handleSave() {
		if (!draft) return
		const payload = payloadFromDraft(draft)
		if (mode === 'create') {
			createMutation.mutate(payload)
		} else if (mode === 'edit') {
			updateMutation.mutate(payload)
		}
	}

	function handleDelete() {
		if (!draft?.id || isPersistedGlobalRule(draft)) return
		if (
			typeof window !== 'undefined' &&
			!window.confirm(t('actions.confirmDelete'))
		)
			return
		deleteMutation.mutate(draft.id)
	}

	const categoryOptions = [
		{ value: ALL_SCOPE, label: 'All' },
		...categories
			.filter(
				(category) =>
					category.isActive || category.slug === draft?.categorySlug,
			)
			.map((category) => ({
				value: category.slug,
				label: category.name,
			})),
	]
	const productsInScope = draft?.categorySlug
		? products.filter((product) => product.category === draft.categorySlug)
		: []
	const productOptions = [
		{ value: ALL_SCOPE, label: 'All' },
		...productsInScope
			.filter(
				(product) =>
					product.availability_status !== 'hidden' ||
					product.slug === draft?.productSlug,
			)
			.map((product) => ({
				value: product.slug,
				label: product.name,
			})),
	]
	const categoryNameBySlug = new Map(
		categories.map((category) => [category.slug, category.name]),
	)
	const productNameBySlug = new Map(
		products.map((product) => [product.slug, product.name]),
	)

	function setCategorySlug(value: string) {
		if (!draft || readOnly) return
		const categorySlug = value === ALL_SCOPE ? null : value
		const productStillInCategory =
			categorySlug && draft.productSlug
				? products.some(
						(product) =>
							product.slug === draft.productSlug &&
							product.category === categorySlug,
					)
				: false
		setDraft({
			...draft,
			categorySlug,
			productSlug: productStillInCategory ? draft.productSlug : null,
			productCategory: scopeKey(
				categorySlug,
				productStillInCategory ? draft.productSlug : null,
			),
		})
	}

	function setProductSlug(value: string) {
		if (!draft || readOnly) return
		const productSlug = value === ALL_SCOPE ? null : value
		setDraft({
			...draft,
			productSlug,
			productCategory: scopeKey(draft.categorySlug, productSlug),
		})
	}

	const saveDisabled =
		!draft ||
		draft.floorMargin > draft.targetMargin ||
		draft.targetMargin > draft.bonusMargin ||
		(mode === 'create' && !draft.categorySlug && !draft.productSlug)

	const columns: ColumnDef<AdminPricingRuleRow>[] = [
		{
			key: 'scope',
			labelKey: 'volumes.pricingRules.columns.scope',
			width: 'minmax(180px, 1.4fr)',
			mobileRole: 'primary',
			render: (r) => (
				<span className="font-semibold text-[var(--color-text)]">
					{scopeLabel(r, categoryNameBySlug, productNameBySlug)}
				</span>
			),
		},
		{
			key: 'category',
			labelKey: 'volumes.pricingRules.columns.category',
			width: 'minmax(130px, 1fr)',
			mobileRole: 'detail',
			render: (r) => (
				<>
					{r.categorySlug
						? (categoryNameBySlug.get(r.categorySlug) ?? r.categorySlug)
						: 'All'}
				</>
			),
		},
		{
			key: 'product',
			labelKey: 'volumes.pricingRules.columns.product',
			width: 'minmax(130px, 1fr)',
			mobileRole: 'detail',
			render: (r) => (
				<>
					{r.productSlug
						? (productNameBySlug.get(r.productSlug) ?? r.productSlug)
						: 'All'}
				</>
			),
		},
		{
			key: 'bonus',
			labelKey: 'volumes.pricingRules.columns.bonus',
			width: '105px',
			align: 'end',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.bonusMargin}%</>,
		},
		{
			key: 'target',
			labelKey: 'volumes.pricingRules.columns.target',
			width: '110px',
			align: 'end',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.targetMargin}%</>,
		},
		{
			key: 'floor',
			labelKey: 'volumes.pricingRules.columns.floor',
			width: '110px',
			align: 'end',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.floorMargin}%</>,
		},
		{
			key: 'absolute',
			labelKey: 'volumes.pricingRules.columns.absolute',
			width: '120px',
			align: 'end',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.absoluteMinMargin}%</>,
		},
		{
			key: 'status',
			labelKey: 'volumes.pricingRules.columns.status',
			width: '110px',
			mobileRole: 'detail',
			render: (r) => (
				<StatusTag
					label={r.active ? 'Active' : 'Inactive'}
					tone={r.active ? 'primary' : 'muted'}
				/>
			),
		},
	]

	const filter = (rule: AdminPricingRuleRow, q: string) =>
		[
			scopeLabel(rule, categoryNameBySlug, productNameBySlug),
			rule.categorySlug,
			rule.productSlug,
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase()
			.includes(q)

	return (
		<>
			<RegistryMasthead
				volume={volume}
				entryCount={rules.length}
				onOpenVolumes={onOpenVolumes}
				onNewEntry={handleNew}
				onExport={requestExport}
				isExporting={isExporting}
				exportStatus={exportStatus}
			/>
			<EntityIndex
				volume="pricingRules"
				rows={rules}
				columns={columns}
				rowKey={(r) => r.id}
				onRowSelect={handleRowSelect}
				onNewEntry={handleNew}
				filter={filter}
				isLoading={isPending}
				isError={isError}
			/>

			<EntityEditor
				isOpen={mode !== null}
				onClose={handleClose}
				mode={mode}
				idLabel={
					draft
						? scopeLabel(draft, categoryNameBySlug, productNameBySlug)
						: null
				}
				footer={
					draft ? (
						<VolumeEditorFooter
							mode={mode}
							id={isPersistedGlobalRule(draft) ? null : draft.id}
							isSaving={createMutation.isPending || updateMutation.isPending}
							isDeleting={deleteMutation.isPending}
							onEdit={handleEdit}
							onSave={handleSave}
							onCancel={handleCancel}
							onDelete={handleDelete}
							saveDisabled={saveDisabled}
						/>
					) : null
				}
			>
				{draft && (
					<div className="space-y-6">
						<Section title={t('editor.section.scope')} />
						<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
							<Field label={t('editor.fields.pricingCategory')} required>
								<SelectControl
									value={draft.categorySlug ?? ALL_SCOPE}
									onChange={setCategorySlug}
									options={categoryOptions}
									readOnly={readOnly || isPersistedGlobalRule(draft)}
									ariaLabel={t('editor.fields.pricingCategory')}
								/>
							</Field>
							<Field label={t('editor.fields.pricingProduct')} required>
								<SelectControl
									value={draft.productSlug ?? ALL_SCOPE}
									onChange={setProductSlug}
									options={productOptions}
									readOnly={
										readOnly ||
										isPersistedGlobalRule(draft) ||
										!draft.categorySlug
									}
									ariaLabel={t('editor.fields.pricingProduct')}
								/>
							</Field>
						</div>
						{mode === 'create' && !draft.categorySlug && !draft.productSlug ? (
							<p className="text-[12px] leading-relaxed text-[var(--color-text-subtle)]">
								New entries are exceptions. Edit the Global default row to
								change the all-products margin.
							</p>
						) : null}

						<Section title={t('editor.section.commercial')} />
						<div className="flex flex-col gap-6 lg:grid lg:grid-cols-3">
							<Field label={t('editor.fields.bonusMargin')}>
								<NumberControl
									value={draft.bonusMargin}
									onChange={(v) => setDraft({ ...draft, bonusMargin: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.bonusMargin')}
									min={0}
									max={99}
									step={0.1}
									suffix="%"
								/>
							</Field>
							<Field label={t('editor.fields.targetMargin')}>
								<NumberControl
									value={draft.targetMargin}
									onChange={(v) => setDraft({ ...draft, targetMargin: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.targetMargin')}
									min={0}
									max={99}
									step={0.1}
									suffix="%"
								/>
							</Field>
							<Field label={t('editor.fields.floorMargin')}>
								<NumberControl
									value={draft.floorMargin}
									onChange={(v) => setDraft({ ...draft, floorMargin: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.floorMargin')}
									min={0}
									max={99}
									step={0.1}
									suffix="%"
								/>
							</Field>
						</div>
						{draft.floorMargin > draft.targetMargin ||
						draft.targetMargin > draft.bonusMargin ? (
							<p className="text-[12px] leading-relaxed text-[var(--color-danger)]">
								Margins must be ordered as Bonus ≥ Target ≥ Floor.
							</p>
						) : null}
						<Field label={t('editor.fields.active')}>
							{readOnly ? (
								<StatusTag
									label={draft.active ? 'Active' : 'Inactive'}
									tone={draft.active ? 'primary' : 'muted'}
								/>
							) : (
								<Toggle
									isSelected={draft.active}
									onChange={(checked) =>
										setDraft({ ...draft, active: checked })
									}
									aria-label={t('editor.fields.active')}
								/>
							)}
						</Field>
					</div>
				)}
			</EntityEditor>
		</>
	)
}

function isGlobalRule(
	rule: Pick<PricingRuleDraft, 'categorySlug' | 'productSlug'>,
) {
	return !rule.categorySlug && !rule.productSlug
}

function isPersistedGlobalRule(
	rule: Pick<PricingRuleDraft, 'id' | 'categorySlug' | 'productSlug'>,
) {
	return Boolean(rule.id) && isGlobalRule(rule)
}

function scopeKey(categorySlug: string | null, productSlug: string | null) {
	if (!categorySlug) return 'all'
	return productSlug ? `${categorySlug}:${productSlug}` : categorySlug
}

function scopeLabel(
	rule: Pick<
		AdminPricingRuleRow | PricingRuleDraft,
		'categorySlug' | 'productSlug' | 'productCategory'
	>,
	categoryNameBySlug: Map<string, string>,
	productNameBySlug: Map<string, string>,
) {
	if (!rule.categorySlug) return 'Global default'
	const categoryLabel =
		categoryNameBySlug.get(rule.categorySlug) ?? rule.categorySlug
	if (!rule.productSlug) return `${categoryLabel} · All products`
	return `${categoryLabel} · ${productNameBySlug.get(rule.productSlug) ?? rule.productSlug}`
}
