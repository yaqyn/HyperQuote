import type {
	QuoteDeliveryLocation,
	QuoteDeliveryWindow,
	QuoteLocationSearchResult,
	QuoteProjectSummary,
	QuoteRecentLocation,
} from '@hyperquote/quote-cart/checkout'
import {
	isEgyptMobileInput,
	toEgyptMobileInput,
} from '@hyperquote/quote-cart/checkout'
import { QuoteFlowDialog } from '@hyperquote/ui/quote-flow/QuoteFlowDialog'
import {
	AgreementStep,
	ContactStep,
	DeliveryStep,
	FlowFailure,
	FlowLoading,
	FlowSuccess,
	LocationStep,
	type NewAddressDraft,
	ProjectStep,
	QuoteFlowContentProvider,
} from '@hyperquote/ui/quote-flow/QuoteFlowSteps'
import type { QuoteLocationPoint } from '@hyperquote/ui/quote-flow/QuoteLocationMap'
import { type CalendarDate, today } from '@internationalized/date'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DateValue } from 'react-aria-components/DateField'
import { useTranslation } from 'react-i18next'
import { toDraftQuoteRequestItemPayloads } from '../../lib/draft-quote-cart'
import {
	createCustomerProject,
	getCustomerProjects,
	getCustomerQuoteProject,
	getRecentDeliveryLocations,
} from '../../lib/server/projects'
import {
	reversePortalQuoteLocation,
	searchPortalQuoteLocations,
} from '../../lib/server/quote-location'
import { submitQuoteRequest } from '../../lib/server/quote-requests'
import { getCustomerProfile } from '../../lib/server/settings'
import { unavailableItemNamesFromError } from '../../lib/unavailable-quote-items'
import { useDraftQuoteStore } from '../../stores/draft-quote'
import { usePortalStore } from '../../stores/portal'

const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CAIRO_TIME_ZONE = 'Africa/Cairo'

type PortalQuoteFlowStep =
	| 'agreement'
	| 'contact'
	| 'delivery'
	| 'location'
	| 'project'
type PortalQuoteFlowPhase =
	| PortalQuoteFlowStep
	| 'failure'
	| 'loading'
	| 'success'

const EMPTY_ADDRESS: NewAddressDraft = {
	area: '',
	city: '',
	governorate: '',
	latitude: null,
	locationName: '',
	locationNameAr: '',
	longitude: null,
	street: '',
}

function isNonDeliveryDay(date: DateValue): boolean {
	const weekday = date.toDate(CAIRO_TIME_ZONE).getDay()
	return weekday === 5 || weekday === 6
}

function firstDeliveryDay(): CalendarDate {
	let date = today(CAIRO_TIME_ZONE).add({ days: 1 })
	while (isNonDeliveryDay(date)) date = date.add({ days: 1 })
	return date
}

export function PortalQuoteRequestDialog({
	draftId,
	isOpen,
	onClose,
	onSubmitted,
}: {
	draftId: string | null
	isOpen: boolean
	onClose: () => void
	onSubmitted: (reference: string) => void
}) {
	const { t, i18n } = useTranslation('portal')
	const items = useDraftQuoteStore((state) => state.items)
	const globalNote = useDraftQuoteStore((state) => state.globalNote)
	const clearCart = useDraftQuoteStore((state) => state.clear)
	const pendingProjectId = usePortalStore((state) => state.pendingProjectId)
	const setPendingProjectId = usePortalStore(
		(state) => state.setPendingProjectId,
	)
	const quoteItems = useMemo(
		() =>
			toDraftQuoteRequestItemPayloads(items, {
				isArabic: i18n.language === 'ar',
			}),
		[i18n.language, items],
	)
	const [phase, setPhase] = useState<PortalQuoteFlowPhase>('loading')
	const [projects, setProjects] = useState<QuoteProjectSummary[]>([])
	const [projectId, setProjectId] = useState<string | null | undefined>()
	const [projectCreating, setProjectCreating] = useState(false)
	const [recentLocations, setRecentLocations] = useState<QuoteRecentLocation[]>(
		[],
	)
	const [deliveryAddress, setDeliveryAddress] =
		useState<QuoteDeliveryLocation | null>(null)
	const [newAddress, setNewAddress] = useState<NewAddressDraft>(EMPTY_ADDRESS)
	const [mapFocusPoint, setMapFocusPoint] = useState<QuoteLocationPoint | null>(
		null,
	)
	const [locationQuery, setLocationQuery] = useState('')
	const [locationResults, setLocationResults] = useState<
		QuoteLocationSearchResult[]
	>([])
	const [locationSearching, setLocationSearching] = useState(false)
	const [locationResolving, setLocationResolving] = useState(false)
	const reverseRequestRef = useRef(0)
	const [deliveryDate, setDeliveryDate] = useState<DateValue>(() =>
		firstDeliveryDay(),
	)
	const [deliveryWindow, setDeliveryWindow] =
		useState<QuoteDeliveryWindow | null>(null)
	const [contactEmail, setContactEmail] = useState('')
	const [contactPhone, setContactPhone] = useState('')
	const [agreementAccepted, setAgreementAccepted] = useState(false)
	const [idempotencyKey, setIdempotencyKey] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [pending, setPending] = useState(false)
	const [successReference, setSuccessReference] = useState('')
	const earliestDate = useMemo(() => firstDeliveryDay(), [])
	const latestDate = useMemo(
		() => earliestDate.add({ months: 2 }),
		[earliestDate],
	)

	useEffect(() => {
		if (!isOpen) return
		let active = true
		setPhase('loading')
		setError(null)
		setPending(false)
		setSuccessReference('')
		setProjects([])
		setProjectId(undefined)
		setRecentLocations([])
		setLocationQuery('')
		setLocationResults([])
		setNewAddress(EMPTY_ADDRESS)
		setMapFocusPoint(null)
		setDeliveryAddress(null)
		setDeliveryDate(firstDeliveryDay())
		setDeliveryWindow(null)
		setAgreementAccepted(false)
		setIdempotencyKey(window.crypto.randomUUID())

		void Promise.all([
			getCustomerProfile(),
			getCustomerProjects(),
			getRecentDeliveryLocations(),
			getCustomerQuoteProject({ data: { quoteRequestId: draftId } }),
		])
			.then(([profile, projectRows, locationRows, draftProject]) => {
				if (!active) return
				setContactEmail(profile.email ?? '')
				setContactPhone(toEgyptMobileInput(profile.phone ?? ''))
				setProjects(projectRows)
				setRecentLocations(locationRows)
				setProjectId(
					draftProject.projectId === undefined
						? pendingProjectId
						: draftProject.projectId,
				)
				setPhase('project')
			})
			.catch(() => {
				if (!active) return
				setError(t('quoteFlow.errors.defaults'))
				setPhase('failure')
			})

		return () => {
			active = false
		}
	}, [draftId, isOpen, pendingProjectId, t])

	async function createProject(name: string) {
		setProjectCreating(true)
		setError(null)
		try {
			const result = await createCustomerProject({ data: { name } })
			setProjects((current) => [result.project, ...current])
			setProjectId(result.project.id)
		} catch {
			setError(t('quoteFlow.errors.project'))
		} finally {
			setProjectCreating(false)
		}
	}

	function chooseRecentLocation(location: QuoteRecentLocation) {
		setMapFocusPoint({
			latitude: location.latitude,
			longitude: location.longitude,
		})
		setNewAddress({
			area: location.area,
			city: location.city,
			governorate: location.governorate,
			latitude: location.latitude,
			locationName: location.locationName,
			locationNameAr: location.locationNameAr,
			longitude: location.longitude,
			street: location.street,
		})
		setDeliveryAddress(null)
		setLocationQuery(
			i18n.language === 'ar' ? location.locationNameAr : location.locationName,
		)
		setLocationResults([])
		setError(null)
	}

	function continueFromProject() {
		if (projectId === undefined) return
		setError(null)
		setPhase('location')
	}

	async function searchLocation() {
		const query = locationQuery.trim()
		if (query.length < 3) {
			setError(t('quoteFlow.location.searchMinimum'))
			return
		}
		setLocationSearching(true)
		setError(null)
		try {
			const result = await searchPortalQuoteLocations({
				data: { locale: i18n.language === 'ar' ? 'ar' : 'en', query },
			})
			if (!result.success) {
				setError(
					result.error === 'rate_limited'
						? t('quoteFlow.location.rateLimited')
						: t('quoteFlow.location.searchError'),
				)
				return
			}
			setLocationResults(result.results)
			if (result.results.length === 0) {
				setError(t('quoteFlow.location.noResults'))
			}
		} catch {
			setError(t('quoteFlow.location.searchError'))
		} finally {
			setLocationSearching(false)
		}
	}

	function chooseLocationResult(result: QuoteLocationSearchResult) {
		setMapFocusPoint({
			latitude: result.latitude,
			longitude: result.longitude,
		})
		setNewAddress(EMPTY_ADDRESS)
		setDeliveryAddress(null)
		setLocationResults([])
		setLocationQuery(result.displayName)
		setError(null)
	}

	async function chooseMapPoint(point: QuoteLocationPoint) {
		const requestId = ++reverseRequestRef.current
		setMapFocusPoint(point)
		setDeliveryAddress(null)
		setNewAddress((current) => ({
			...current,
			latitude: point.latitude,
			longitude: point.longitude,
		}))
		setLocationResolving(true)
		setError(null)
		try {
			const result = await reversePortalQuoteLocation({
				data: {
					latitude: point.latitude,
					locale: i18n.language === 'ar' ? 'ar' : 'en',
					longitude: point.longitude,
				},
			})
			if (requestId !== reverseRequestRef.current) return
			if (!result.success) {
				setError(
					result.error === 'rate_limited'
						? t('quoteFlow.location.rateLimitedManual')
						: t('quoteFlow.location.reverseError'),
				)
				return
			}
			setNewAddress({
				area: result.result.area,
				city: result.result.city,
				governorate: result.result.governorate,
				latitude: point.latitude,
				locationName: result.locationName,
				locationNameAr: result.locationNameAr,
				longitude: point.longitude,
				street: result.result.street,
			})
		} catch {
			if (requestId !== reverseRequestRef.current) return
			setError(t('quoteFlow.location.reverseError'))
		} finally {
			if (requestId === reverseRequestRef.current) setLocationResolving(false)
		}
	}

	function continueFromLocation() {
		setError(null)
		if (
			newAddress.latitude === null ||
			newAddress.longitude === null ||
			!newAddress.street.trim() ||
			!newAddress.city.trim() ||
			!newAddress.governorate.trim() ||
			!newAddress.locationName.trim() ||
			!newAddress.locationNameAr.trim()
		) {
			setError(t('quoteFlow.location.addressRequired'))
			return
		}
		setDeliveryAddress({
			area: newAddress.area.trim() || newAddress.city.trim(),
			city: newAddress.city.trim(),
			governorate: newAddress.governorate.trim(),
			latitude: newAddress.latitude,
			locationName: newAddress.locationName.trim(),
			locationNameAr: newAddress.locationNameAr.trim(),
			longitude: newAddress.longitude,
			street: newAddress.street.trim(),
		})
		setPhase('delivery')
	}

	function continueFromDelivery() {
		if (!deliveryDate || !deliveryWindow) {
			setError(t('quoteFlow.delivery.required'))
			return
		}
		setError(null)
		setPhase('contact')
	}

	function continueFromContact() {
		const email = contactEmail.trim().toLowerCase()
		if (!EMAIL_ADDRESS_REGEX.test(email)) {
			setError(t('quoteFlow.contact.emailInvalid'))
			return
		}
		if (!isEgyptMobileInput(contactPhone)) {
			setError(t('quoteFlow.contact.phoneInvalid'))
			return
		}
		setContactEmail(email)
		setError(null)
		setPhase('agreement')
	}

	async function submitQuote() {
		if (
			!agreementAccepted ||
			!deliveryAddress ||
			!deliveryWindow ||
			quoteItems.length === 0
		) {
			setError(t('quoteFlow.agreement.required'))
			return
		}
		setPending(true)
		setError(null)
		try {
			const result = await submitQuoteRequest({
				data: {
					agreementAccepted: true,
					contactEmail,
					contactPhone: `+20${contactPhone}`,
					deliveryLocation: deliveryAddress,
					deliveryDate: deliveryDate.toString(),
					draftId: draftId ?? undefined,
					idempotencyKey: idempotencyKey || window.crypto.randomUUID(),
					items: quoteItems,
					notes: globalNote.trim() || undefined,
					projectId,
					preferredDeliveryWindow: deliveryWindow,
				},
			})
			setSuccessReference(result.reference)
			clearCart()
			onSubmitted(result.reference)
			setPhase('success')
		} catch (submitError) {
			const unavailableItems = unavailableItemNamesFromError(submitError)
			setError(
				unavailableItems.length > 0
					? t('orders.unavailableItems', {
							items: unavailableItems.join(', '),
						})
					: t('quoteFlow.errors.submit'),
			)
		} finally {
			setPending(false)
		}
	}

	function closeDialog() {
		setPendingProjectId(undefined)
		onClose()
	}

	function goBack() {
		setError(null)
		if (phase === 'location') setPhase('project')
		if (phase === 'delivery') setPhase('location')
		if (phase === 'contact') setPhase('delivery')
		if (phase === 'agreement') setPhase('contact')
	}

	const currentStep = isFlowStep(phase) ? phase : null
	const mapPoint =
		newAddress.latitude !== null && newAddress.longitude !== null
			? {
					latitude: newAddress.latitude,
					longitude: newAddress.longitude,
				}
			: null
	const nextAction =
		currentStep === 'project'
			? continueFromProject
			: currentStep === 'location'
				? continueFromLocation
				: currentStep === 'delivery'
					? continueFromDelivery
					: currentStep === 'contact'
						? continueFromContact
						: submitQuote
	const nextDisabled =
		currentStep === 'project'
			? projectId === undefined
			: currentStep === 'location'
				? !mapPoint ||
					locationResolving ||
					!newAddress.locationName.trim() ||
					!newAddress.locationNameAr.trim()
				: currentStep === 'delivery'
					? !deliveryDate || !deliveryWindow
					: currentStep === 'contact'
						? !EMAIL_ADDRESS_REGEX.test(contactEmail.trim()) ||
							!isEgyptMobileInput(contactPhone)
						: currentStep === 'agreement'
							? !agreementAccepted
							: false
	const requirementMessage = currentStep
		? t(`quoteFlow.requirements.${currentStep}`)
		: null

	if (!isOpen) return null

	return (
		<QuoteFlowDialog
			currentStep={currentStep}
			error={error}
			isOpen={isOpen}
			namespace="portal"
			nextIsSubmit={currentStep === 'agreement'}
			nextDisabled={nextDisabled}
			nextLabel={
				currentStep === 'agreement'
					? t('quoteFlow.submit')
					: t('quoteFlow.next')
			}
			onBack={currentStep && currentStep !== 'project' ? goBack : undefined}
			onClose={closeDialog}
			onNext={currentStep ? nextAction : undefined}
			pending={pending}
			requirementMessage={requirementMessage}
			terminalAction={phase === 'failure' || phase === 'success'}
		>
			<QuoteFlowContentProvider namespace="portal">
				{phase === 'loading' && <FlowLoading />}
				{phase === 'project' && (
					<ProjectStep
						creating={projectCreating}
						onCreate={createProject}
						onSelect={setProjectId}
						projects={projects}
						selectedProjectId={projectId}
					/>
				)}
				{phase === 'location' && (
					<LocationStep
						locationQuery={locationQuery}
						locationResolving={locationResolving}
						locationResults={locationResults}
						locationSearching={locationSearching}
						mapFocusPoint={mapFocusPoint}
						mapPoint={mapPoint}
						newAddress={newAddress}
						onLocationQueryChange={setLocationQuery}
						onMapPointChange={chooseMapPoint}
						onSearch={searchLocation}
						onSearchResult={chooseLocationResult}
						onRecentLocation={chooseRecentLocation}
						recentLocations={recentLocations}
					/>
				)}
				{phase === 'delivery' && (
					<DeliveryStep
						deliveryDate={deliveryDate}
						deliveryWindow={deliveryWindow}
						earliestDate={earliestDate}
						latestDate={latestDate}
						onDateChange={setDeliveryDate}
						onWindowChange={setDeliveryWindow}
					/>
				)}
				{phase === 'contact' && (
					<ContactStep
						email={contactEmail}
						onEmailChange={setContactEmail}
						onPhoneChange={(value) =>
							setContactPhone(toEgyptMobileInput(value))
						}
						phone={contactPhone}
					/>
				)}
				{phase === 'agreement' && deliveryAddress && deliveryWindow && (
					<AgreementStep
						accepted={agreementAccepted}
						address={deliveryAddress}
						date={deliveryDate}
						email={contactEmail}
						itemCount={quoteItems.length}
						onAcceptedChange={setAgreementAccepted}
						phone={contactPhone}
						windowId={deliveryWindow}
					/>
				)}
				{phase === 'success' && (
					<FlowSuccess
						body={t('quoteFlow.success.body')}
						heading={t('quoteFlow.success.heading')}
						reference={successReference}
					/>
				)}
				{phase === 'failure' && error && <FlowFailure message={error} />}
			</QuoteFlowContentProvider>
		</QuoteFlowDialog>
	)
}

function isFlowStep(phase: PortalQuoteFlowPhase): phase is PortalQuoteFlowStep {
	return (
		phase === 'project' ||
		phase === 'location' ||
		phase === 'delivery' ||
		phase === 'contact' ||
		phase === 'agreement'
	)
}
