import {
	formatQuoteRequestAddress,
	QUOTE_DELIVERY_WINDOWS,
	type QuoteDeliveryLocation,
	type QuoteDeliveryWindow,
	type QuoteLocationSearchResult,
	type QuoteProjectSummary,
	type QuoteRecentLocation,
} from '@hyperquote/quote-cart/checkout'
import {
	Check,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	ContactRound,
	FolderKanban,
	LoaderCircle,
	MapPin,
	Plus,
	Search,
	X,
} from 'lucide-react'
import {
	createContext,
	lazy,
	type ReactNode,
	Suspense,
	useContext,
	useState,
	useSyncExternalStore,
} from 'react'
import { Button as AriaButton } from 'react-aria-components/Button'
import {
	Calendar,
	CalendarCell,
	CalendarGrid,
	CalendarGridBody,
	CalendarGridHeader,
	CalendarHeaderCell,
} from 'react-aria-components/Calendar'
import type { DateValue } from 'react-aria-components/DateField'
import { Heading } from 'react-aria-components/Dialog'
import { useTranslation } from 'react-i18next'
import type { QuoteFlowNamespace } from './QuoteFlowDialog'
import type { QuoteLocationPoint } from './QuoteLocationMap'

const QuoteLocationMap = lazy(() =>
	import('./QuoteLocationMap').then((module) => ({
		default: module.QuoteLocationMap,
	})),
)

const CAIRO_TIME_ZONE = 'Africa/Cairo'
const QuoteFlowNamespaceContext = createContext<QuoteFlowNamespace>('website')

export interface NewAddressDraft {
	area: string
	city: string
	governorate: string
	latitude: number | null
	locationName: string
	locationNameAr: string
	longitude: number | null
	street: string
}

export function QuoteFlowContentProvider({
	children,
	namespace,
}: {
	children: ReactNode
	namespace: QuoteFlowNamespace
}) {
	return (
		<QuoteFlowNamespaceContext.Provider value={namespace}>
			{children}
		</QuoteFlowNamespaceContext.Provider>
	)
}

export function ProjectStep({
	creating,
	onCreate,
	onSelect,
	projects,
	selectedProjectId,
}: {
	creating: boolean
	onCreate: (name: string) => Promise<void>
	onSelect: (projectId: string | null) => void
	projects: QuoteProjectSummary[]
	selectedProjectId: string | null | undefined
}) {
	const { t } = useQuoteFlowTranslation()
	const [newProjectName, setNewProjectName] = useState('')
	const [createOpen, setCreateOpen] = useState(false)

	async function createProject() {
		const name = newProjectName.trim()
		if (name.length < 2) return
		await onCreate(name)
		setNewProjectName('')
		setCreateOpen(false)
	}

	return (
		<div className="mx-auto w-full max-w-[760px] px-5 py-7 sm:px-8 sm:py-10">
			<StepHeading
				body={t('quoteFlow.project.body')}
				heading={t('quoteFlow.project.heading')}
			/>
			<div className="mt-7 grid gap-2 sm:grid-cols-2">
				<button
					type="button"
					onClick={() => onSelect(null)}
					aria-pressed={selectedProjectId === null}
					className={`min-h-[86px] rounded-[12px] border p-4 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
						selectedProjectId === null
							? 'border-[var(--color-primary)] bg-[var(--site-blue-wash,var(--color-surface))]'
							: 'border-[var(--site-rule,var(--color-border))] hover:border-[var(--color-primary)]/35'
					}`}
				>
					<p className="text-[13px] font-semibold text-[var(--color-text)]">
						{t('quoteFlow.project.independent')}
					</p>
					<p className="mt-1 text-[11px] leading-5 text-[var(--color-text-muted)]">
						{t('quoteFlow.project.independentBody')}
					</p>
				</button>
				{projects.map((project) => {
					const selected = selectedProjectId === project.id
					const total =
						project.draftCount + project.requestCount + project.orderCount
					return (
						<button
							key={project.id}
							type="button"
							onClick={() => onSelect(project.id)}
							aria-pressed={selected}
							className={`min-h-[86px] rounded-[12px] border p-4 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
								selected
									? 'border-[var(--color-primary)] bg-[var(--site-blue-wash,var(--color-surface))]'
									: 'border-[var(--site-rule,var(--color-border))] hover:border-[var(--color-primary)]/35'
							}`}
						>
							<div className="flex items-start justify-between gap-3">
								<p className="text-[13px] font-semibold text-[var(--color-text)]">
									{project.name}
								</p>
								<FolderKanban
									size={15}
									strokeWidth={1.7}
									className="shrink-0 text-[var(--color-primary)]"
								/>
							</div>
							<p className="mt-2 text-[10px] font-medium text-[var(--color-text-subtle)]">
								{t('quoteFlow.project.activityCount', { count: total })}
							</p>
						</button>
					)
				})}
			</div>

			{createOpen ? (
				<form
					onSubmit={(event) => {
						event.preventDefault()
						void createProject()
					}}
					className="mt-3 flex items-center gap-2 rounded-[12px] border border-[var(--site-rule,var(--color-border))] p-2"
				>
					<input
						value={newProjectName}
						onChange={(event) => setNewProjectName(event.currentTarget.value)}
						placeholder={t('quoteFlow.project.namePlaceholder')}
						className="h-9 min-w-0 flex-1 bg-transparent px-2 text-[13px] outline-none placeholder:text-[var(--color-text-subtle)]"
					/>
					<button
						type="submit"
						disabled={creating || newProjectName.trim().length < 2}
						className="h-9 rounded-[9px] bg-[var(--color-primary)] px-4 text-[11px] font-semibold text-white disabled:opacity-40"
					>
						{creating
							? t('quoteFlow.project.creating')
							: t('quoteFlow.project.create')}
					</button>
				</form>
			) : (
				<button
					type="button"
					onClick={() => setCreateOpen(true)}
					className="mt-4 inline-flex h-9 items-center gap-2 rounded-[9px] px-1 text-[12px] font-semibold text-[var(--color-primary)]"
				>
					<Plus size={14} strokeWidth={1.9} />
					{t('quoteFlow.project.new')}
				</button>
			)}
		</div>
	)
}

function useQuoteFlowTranslation() {
	return useTranslation(useContext(QuoteFlowNamespaceContext))
}

function isNonDeliveryDay(date: DateValue): boolean {
	const weekday = date.toDate(CAIRO_TIME_ZONE).getDay()
	return weekday === 5 || weekday === 6
}

function ClientOnly({
	children,
	fallback,
}: {
	children: ReactNode
	fallback: ReactNode
}) {
	const hydrated = useSyncExternalStore(
		() => () => undefined,
		() => true,
		() => false,
	)
	return hydrated ? children : fallback
}

export function LocationStep({
	locationQuery,
	locationResolving,
	locationResults,
	locationSearching,
	mapFocusPoint,
	mapPoint,
	newAddress,
	onLocationQueryChange,
	onMapPointChange,
	onSearch,
	onSearchResult,
	onRecentLocation,
	recentLocations = [],
}: {
	locationQuery: string
	locationResolving: boolean
	locationResults: QuoteLocationSearchResult[]
	locationSearching: boolean
	mapFocusPoint: QuoteLocationPoint | null
	mapPoint: QuoteLocationPoint | null
	newAddress: NewAddressDraft
	onLocationQueryChange: (value: string) => void
	onMapPointChange: (point: QuoteLocationPoint) => void
	onSearch: () => void
	onSearchResult: (result: QuoteLocationSearchResult) => void
	onRecentLocation?: (location: QuoteRecentLocation) => void
	recentLocations?: QuoteRecentLocation[]
}) {
	const { t, i18n } = useQuoteFlowTranslation()

	return (
		<div className="grid min-h-full lg:grid-cols-[minmax(320px,0.82fr)_minmax(360px,1.18fr)]">
			<div className="px-5 py-6 sm:px-7 sm:py-7">
				<StepHeading
					body={t('quoteFlow.location.body')}
					heading={t('quoteFlow.location.heading')}
				/>
				{recentLocations.length > 0 && onRecentLocation && (
					<div className="mt-5">
						<p className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-text-subtle)]">
							{t('quoteFlow.location.recent')}
						</p>
						<div className="mt-2 grid gap-1.5">
							{recentLocations.slice(0, 3).map((location) => (
								<button
									key={location.id}
									type="button"
									onClick={() => onRecentLocation(location)}
									className="flex items-start gap-2.5 rounded-[9px] border border-[var(--site-rule,var(--color-border))] px-3 py-2.5 text-start transition-colors hover:border-[var(--color-primary)]/35 hover:bg-[var(--site-blue-wash,var(--color-surface))]/45"
								>
									<MapPin
										size={13}
										className="mt-0.5 shrink-0 text-[var(--color-primary)]"
									/>
									<span className="line-clamp-2 text-[11px] font-medium leading-4 text-[var(--color-text-muted)]">
										{i18n.language === 'ar'
											? location.locationNameAr
											: location.locationName}
									</span>
								</button>
							))}
						</div>
					</div>
				)}
				<form
					onSubmit={(event) => {
						event.preventDefault()
						onSearch()
					}}
					className="relative mt-5"
				>
					<label htmlFor="quote-location-search" className="sr-only">
						{t('quoteFlow.location.searchLabel')}
					</label>
					<div className="flex h-11 overflow-hidden rounded-[10px] border border-[var(--site-rule,var(--color-border))] bg-[var(--color-card,var(--color-bg))] focus-within:border-[var(--color-primary)]">
						<input
							id="quote-location-search"
							value={locationQuery}
							onChange={(event) =>
								onLocationQueryChange(event.currentTarget.value)
							}
							placeholder={t('quoteFlow.location.searchPlaceholder')}
							className="min-w-0 flex-1 bg-transparent px-3 text-[13px] outline-none placeholder:text-[var(--color-text-subtle)]"
						/>
						<button
							type="submit"
							disabled={locationSearching}
							aria-label={t('quoteFlow.location.searchAction')}
							className="flex w-11 items-center justify-center border-s border-[var(--site-rule,var(--color-border))] text-[var(--color-primary)] hover:bg-[var(--site-blue-wash,var(--color-surface))] disabled:opacity-50"
						>
							{locationSearching ? (
								<LoaderCircle size={15} className="animate-spin" />
							) : (
								<Search size={15} strokeWidth={1.8} />
							)}
						</button>
					</div>
					{locationResults.length > 0 && (
						<div className="absolute inset-x-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-[10px] border border-[var(--site-rule,var(--color-border))] bg-[var(--color-card,var(--color-bg))] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
							{locationResults.map((result) => (
								<button
									key={result.id}
									type="button"
									onClick={() => onSearchResult(result)}
									className="block w-full rounded-[7px] px-3 py-2.5 text-start text-[11px] leading-5 text-[var(--color-text-muted)] hover:bg-[var(--site-blue-wash,var(--color-surface))] hover:text-[var(--color-text)]"
								>
									{result.displayName}
								</button>
							))}
						</div>
					)}
				</form>

				{mapPoint ? (
					<div className="mt-6 rounded-[10px] border border-[var(--color-primary)]/25 bg-[var(--site-blue-wash,var(--color-surface))]/65 p-3.5">
						<div className="mb-2 flex items-center justify-between">
							<p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
								{t('quoteFlow.location.selectedPoint')}
							</p>
							{locationResolving && (
								<span className="inline-flex items-center gap-1 text-[9px] text-[var(--color-text-subtle)]">
									<LoaderCircle size={10} className="animate-spin" />
									{t('quoteFlow.location.resolving')}
								</span>
							)}
						</div>
						<p className="text-[12px] font-semibold leading-5 text-[var(--color-text)]">
							{(i18n.language === 'ar'
								? newAddress.locationNameAr
								: newAddress.locationName) ||
								formatQuoteRequestAddress(newAddress) ||
								t('quoteFlow.location.resolving')}
						</p>
						<p className="mt-2 font-mono text-[10px] tabular-nums text-[var(--color-text-subtle)]">
							{t('quoteFlow.location.coordinates')}:{' '}
							{mapPoint.latitude.toFixed(6)}, {mapPoint.longitude.toFixed(6)}
						</p>
					</div>
				) : (
					<div className="mt-6 flex items-start gap-3 rounded-[10px] border border-dashed border-[var(--site-rule,var(--color-border))] p-3.5 text-[11px] leading-5 text-[var(--color-text-muted)]">
						<MapPin
							size={15}
							className="mt-0.5 shrink-0 text-[var(--color-primary)]"
						/>
						<p>{t('quoteFlow.location.searchHint')}</p>
					</div>
				)}
			</div>

			<div className="min-h-[280px] border-t border-[var(--site-rule,var(--color-border))] lg:min-h-full lg:border-s lg:border-t-0">
				<ClientOnly fallback={<MapFallback />}>
					<Suspense fallback={<MapFallback />}>
						<QuoteLocationMap
							focusPoint={mapFocusPoint}
							point={mapPoint}
							onPointChange={onMapPointChange}
						/>
					</Suspense>
				</ClientOnly>
			</div>
		</div>
	)
}

export function DeliveryStep({
	deliveryDate,
	deliveryWindow,
	earliestDate,
	latestDate,
	onDateChange,
	onWindowChange,
}: {
	deliveryDate: DateValue
	deliveryWindow: QuoteDeliveryWindow | null
	earliestDate: DateValue
	latestDate: DateValue
	onDateChange: (date: DateValue) => void
	onWindowChange: (windowId: QuoteDeliveryWindow) => void
}) {
	const { t } = useQuoteFlowTranslation()

	return (
		<div className="mx-auto w-full max-w-[760px] px-5 py-7 sm:px-8 sm:py-9">
			<StepHeading
				body={t('quoteFlow.delivery.body')}
				heading={t('quoteFlow.delivery.heading')}
			/>
			<div className="mt-7 grid gap-6 md:grid-cols-[320px_1fr] md:gap-8">
				<Calendar
					aria-label={t('quoteFlow.delivery.dateLabel')}
					minValue={earliestDate}
					maxValue={latestDate}
					value={deliveryDate}
					onChange={onDateChange}
					isDateUnavailable={isNonDeliveryDay}
					className="rounded-[12px] border border-[var(--site-rule,var(--color-border))] bg-[var(--color-card,var(--color-bg))] p-3"
				>
					<header className="mb-2 flex items-center justify-between">
						<AriaButton
							slot="previous"
							className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-text-muted)] outline-none hover:bg-[var(--site-concrete,var(--color-surface))] data-[disabled]:opacity-25"
						>
							<ChevronLeft size={15} className="rtl:rotate-180" />
						</AriaButton>
						<Heading className="text-[13px] font-semibold" />
						<AriaButton
							slot="next"
							className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-text-muted)] outline-none hover:bg-[var(--site-concrete,var(--color-surface))] data-[disabled]:opacity-25"
						>
							<ChevronRight size={15} className="rtl:rotate-180" />
						</AriaButton>
					</header>
					<CalendarGrid className="w-full table-fixed border-separate border-spacing-x-1 border-spacing-y-1.5">
						<CalendarGridHeader>
							{(day) => (
								<CalendarHeaderCell className="h-7 text-center text-[9px] font-semibold text-[var(--color-text-subtle)]">
									{day}
								</CalendarHeaderCell>
							)}
						</CalendarGridHeader>
						<CalendarGridBody>
							{(date) => (
								<CalendarCell
									date={date}
									className="mx-auto flex h-9 w-9 items-center justify-center rounded-[8px] p-0 text-center text-[12px] font-medium leading-none tabular-nums outline-none transition-colors data-[disabled]:opacity-20 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/35 data-[hovered]:bg-[var(--site-blue-wash,var(--color-surface))] data-[outside-month]:invisible data-[selected]:bg-[var(--color-primary)] data-[selected]:font-semibold data-[selected]:text-white data-[unavailable]:line-through data-[unavailable]:opacity-25"
								/>
							)}
						</CalendarGridBody>
					</CalendarGrid>
				</Calendar>

				<div>
					<p className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-text-subtle)]">
						{t('quoteFlow.delivery.windowLabel')}
					</p>
					<div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-1">
						{QUOTE_DELIVERY_WINDOWS.map((windowOption) => {
							const selected = deliveryWindow === windowOption.id
							return (
								<button
									key={windowOption.id}
									type="button"
									onClick={() => onWindowChange(windowOption.id)}
									aria-pressed={selected}
									className={`group grid min-h-[58px] grid-cols-[1fr_auto] items-center gap-4 rounded-[10px] border px-3.5 py-2.5 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
										selected
											? 'border-[var(--color-primary)] bg-[var(--site-blue-wash,var(--color-surface))] shadow-[inset_3px_0_0_var(--color-primary)] rtl:shadow-[inset_-3px_0_0_var(--color-primary)]'
											: 'border-[var(--site-rule,var(--color-border))] hover:border-[var(--color-primary)]/35 hover:bg-[var(--site-blue-wash,var(--color-surface))]/35'
									}`}
								>
									<span className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--color-text)]">
										{t(`quoteFlow.delivery.windows.${windowOption.labelKey}`)}
									</span>
									<span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--color-text-muted)] transition-colors group-hover:text-[var(--color-text)]">
										{t(`quoteFlow.delivery.ranges.${windowOption.labelKey}`)}
									</span>
								</button>
							)
						})}
					</div>
					<p className="mt-3 text-[10px] leading-5 text-[var(--color-text-subtle)]">
						{t('quoteFlow.delivery.preferenceNote')}
					</p>
				</div>
			</div>
		</div>
	)
}

export function ContactStep({
	email,
	onEmailChange,
	onPhoneChange,
	phone,
}: {
	email: string
	onEmailChange: (value: string) => void
	onPhoneChange: (value: string) => void
	phone: string
}) {
	const { t } = useQuoteFlowTranslation()
	return (
		<div className="mx-auto w-full max-w-[620px] px-5 py-8 sm:px-8 sm:py-12">
			<StepHeading
				body={t('quoteFlow.contact.body')}
				heading={t('quoteFlow.contact.heading')}
			/>
			<div className="mt-8 grid gap-5">
				<FlowField
					id="quote-contact-email"
					label={t('quoteFlow.contact.email')}
					onChange={onEmailChange}
					type="email"
					value={email}
				/>
				<label htmlFor="quote-contact-phone" className="block">
					<span className="mb-2 block text-[11px] font-semibold text-[var(--color-text-muted)]">
						{t('quoteFlow.contact.phone')}
					</span>
					<div
						dir="ltr"
						className="flex h-12 overflow-hidden rounded-[10px] border border-[var(--site-rule,var(--color-border))] bg-[var(--color-card,var(--color-bg))] focus-within:border-[var(--color-primary)]"
					>
						<span className="flex items-center border-r border-[var(--site-rule,var(--color-border))] px-3 font-mono text-[12px] text-[var(--color-text-muted)]">
							+20
						</span>
						<input
							id="quote-contact-phone"
							type="tel"
							inputMode="numeric"
							value={phone}
							onChange={(event) => onPhoneChange(event.currentTarget.value)}
							placeholder="10 0000 0000"
							className="min-w-0 flex-1 bg-transparent px-3 font-mono text-[14px] outline-none"
						/>
					</div>
				</label>
			</div>
			<div className="mt-8 flex items-start gap-3 border-t border-[var(--site-rule,var(--color-border))] pt-5 text-[11px] leading-5 text-[var(--color-text-subtle)]">
				<ContactRound
					size={15}
					className="mt-0.5 shrink-0 text-[var(--color-primary)]"
				/>
				<p>{t('quoteFlow.contact.note')}</p>
			</div>
		</div>
	)
}

export function AgreementStep({
	accepted,
	address,
	date,
	email,
	itemCount,
	onAcceptedChange,
	phone,
	windowId,
}: {
	accepted: boolean
	address: QuoteDeliveryLocation
	date: DateValue
	email: string
	itemCount: number
	onAcceptedChange: (accepted: boolean) => void
	phone: string
	windowId: QuoteDeliveryWindow
}) {
	const { t, i18n } = useQuoteFlowTranslation()
	const dateLabel = new Intl.DateTimeFormat(
		i18n.language === 'ar' ? 'ar-EG' : 'en-GB',
		{ dateStyle: 'medium', timeZone: CAIRO_TIME_ZONE },
	).format(date.toDate(CAIRO_TIME_ZONE))
	const windowOption = QUOTE_DELIVERY_WINDOWS.find(
		(option) => option.id === windowId,
	)

	return (
		<div className="mx-auto w-full max-w-[720px] px-5 py-8 sm:px-8 sm:py-10">
			<StepHeading
				body={t('quoteFlow.agreement.body')}
				heading={t('quoteFlow.agreement.heading')}
			/>
			<div className="mt-7 grid gap-6 md:grid-cols-[1fr_0.82fr]">
				<div className="divide-y divide-[var(--site-rule,var(--color-border))] border-y border-[var(--site-rule,var(--color-border))]">
					<AgreementLine>
						{t('quoteFlow.agreement.sourceStatement')}
					</AgreementLine>
					<AgreementLine>
						{t('quoteFlow.agreement.pricingStatement')}
					</AgreementLine>
					<AgreementLine>
						{t('quoteFlow.agreement.deliveryStatement')}
					</AgreementLine>
					<AgreementLine>
						{t('quoteFlow.agreement.contactStatement')}
					</AgreementLine>
				</div>
				<div className="rounded-[12px] border border-[var(--site-rule,var(--color-border))] bg-[var(--site-concrete,var(--color-surface))]/55 p-4">
					<p className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-primary)]">
						{t('quoteFlow.agreement.summary')}
					</p>
					<SummaryLine
						label={t('quoteFlow.agreement.materials')}
						value={t('quoteFlow.agreement.materialCount', { count: itemCount })}
					/>
					<SummaryLine
						label={t('quoteFlow.agreement.location')}
						value={
							i18n.language === 'ar'
								? address.locationNameAr
								: address.locationName
						}
					/>
					<SummaryLine
						label={t('quoteFlow.agreement.delivery')}
						value={`${dateLabel} · ${windowOption ? t(`quoteFlow.delivery.windows.${windowOption.labelKey}`) : windowId}`}
					/>
					<SummaryLine
						label={t('quoteFlow.agreement.contact')}
						value={`${email}\n+20 ${phone}`}
					/>
				</div>
			</div>
			<label
				className={`mt-7 flex cursor-pointer items-start gap-3 rounded-[12px] border p-4 transition-colors ${
					accepted
						? 'border-[var(--site-rule,var(--color-border))] hover:border-[var(--color-primary)]/35'
						: 'border-[var(--color-primary)]/55 bg-[var(--color-primary)]/[0.035]'
				}`}
			>
				<input
					type="checkbox"
					checked={accepted}
					onChange={(event) => onAcceptedChange(event.currentTarget.checked)}
					className="peer sr-only"
				/>
				<span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-[#a8afb9] bg-white text-transparent shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)] transition-colors peer-checked:border-[var(--color-primary)] peer-checked:bg-[var(--color-primary)] peer-checked:text-white peer-focus-visible:ring-3 peer-focus-visible:ring-[var(--color-primary)]/25 dark:border-white/35 dark:bg-white/10 dark:peer-checked:bg-[var(--color-primary)]">
					<Check size={11} strokeWidth={2.5} aria-hidden="true" />
				</span>
				<span className="text-[12px] leading-5 text-[var(--color-text-muted)]">
					{t('quoteFlow.agreement.checkbox')}
				</span>
			</label>
		</div>
	)
}

function StepHeading({ body, heading }: { body: string; heading: string }) {
	return (
		<div>
			<h3 className="text-[22px] font-semibold tracking-[-0.025em] text-[var(--color-text)] sm:text-[24px]">
				{heading}
			</h3>
			<p className="mt-2 max-w-[580px] text-[13px] leading-6 text-[var(--color-text-muted)]">
				{body}
			</p>
		</div>
	)
}

function FlowField({
	id,
	label,
	onChange,
	type,
	value,
}: {
	id: string
	label: string
	onChange: (value: string) => void
	type: 'email' | 'text'
	value: string
}) {
	return (
		<label htmlFor={id} className="block">
			<span className="mb-2 block text-[11px] font-semibold text-[var(--color-text-muted)]">
				{label}
			</span>
			<input
				id={id}
				type={type}
				value={value}
				onChange={(event) => onChange(event.currentTarget.value)}
				className="h-12 w-full rounded-[10px] border border-[var(--site-rule,var(--color-border))] bg-[var(--color-card,var(--color-bg))] px-3 text-[14px] outline-none focus:border-[var(--color-primary)]"
			/>
		</label>
	)
}

function AgreementLine({ children }: { children: ReactNode }) {
	return (
		<div className="flex items-start gap-3 py-3 text-[12px] leading-5 text-[var(--color-text-muted)]">
			<Check
				size={13}
				className="mt-0.5 shrink-0 text-[var(--color-primary)]"
			/>
			<p>{children}</p>
		</div>
	)
}

function SummaryLine({ label, value }: { label: string; value: string }) {
	return (
		<div className="mt-3 border-t border-[var(--site-rule,var(--color-border))] pt-3">
			<p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
				{label}
			</p>
			<p className="mt-1 whitespace-pre-line text-[11px] leading-5 text-[var(--color-text)]">
				{value}
			</p>
		</div>
	)
}

export function FlowLoading() {
	const { t } = useQuoteFlowTranslation()
	return (
		<div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
			<LoaderCircle
				size={22}
				className="animate-spin text-[var(--color-primary)]"
			/>
			<p className="text-[12px] text-[var(--color-text-muted)]">
				{t('quoteFlow.loading')}
			</p>
		</div>
	)
}

export function FlowInlineLoading() {
	return (
		<div className="mt-4 flex justify-center">
			<LoaderCircle
				size={16}
				className="animate-spin text-[var(--color-primary)]"
			/>
		</div>
	)
}

export function FlowError({ children }: { children: ReactNode }) {
	return (
		<p role="alert" className="mb-2 text-[11px] text-[var(--color-error)]">
			{children}
		</p>
	)
}

export function FlowSuccess({
	body,
	heading,
	reference,
}: {
	body: string
	heading: string
	reference: string
}) {
	return (
		<div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-600/20 bg-emerald-600/8 text-emerald-600">
				<CheckCircle2 size={22} strokeWidth={1.8} />
			</div>
			<h3 className="mt-5 text-[22px] font-semibold tracking-[-0.025em]">
				{heading}
			</h3>
			<p className="mt-2 max-w-[430px] text-[13px] leading-6 text-[var(--color-text-muted)]">
				{body}
			</p>
			{reference && (
				<p className="mt-5 border-y border-[var(--site-rule,var(--color-border))] px-6 py-3 font-mono text-[11px] text-[var(--color-primary)]">
					{reference}
				</p>
			)}
		</div>
	)
}

export function FlowFailure({ message }: { message: string }) {
	const { t } = useQuoteFlowTranslation()
	return (
		<div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-error)]/20 bg-[var(--color-error)]/8 text-[var(--color-error)]">
				<X size={21} strokeWidth={1.8} />
			</div>
			<h3 className="mt-5 text-[22px] font-semibold tracking-[-0.025em]">
				{t('quoteFlow.errors.heading')}
			</h3>
			<p
				role="alert"
				className="mt-2 max-w-[430px] text-[13px] leading-6 text-[var(--color-text-muted)]"
			>
				{message}
			</p>
		</div>
	)
}

function MapFallback() {
	const { t } = useQuoteFlowTranslation()
	return (
		<div className="flex h-full min-h-[280px] items-center justify-center bg-[var(--site-concrete,var(--color-surface))]/70">
			<div className="text-center">
				<MapPin size={20} className="mx-auto text-[var(--color-primary)]" />
				<p className="mt-2 text-[10px] text-[var(--color-text-subtle)]">
					{t('quoteFlow.location.mapLoading')}
				</p>
			</div>
		</div>
	)
}
