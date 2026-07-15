import type {
	QuoteDeliveryLocation,
	QuoteDeliveryWindow,
	QuoteLocationSearchResult,
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
	QuoteFlowContentProvider,
} from '@hyperquote/ui/quote-flow/QuoteFlowSteps'
import type { QuoteLocationPoint } from '@hyperquote/ui/quote-flow/QuoteLocationMap'
import { type CalendarDate, today } from '@internationalized/date'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DateValue } from 'react-aria-components/DateField'
import { useTranslation } from 'react-i18next'
import { toDraftQuoteRequestItemPayloads } from '../../lib/draft-quote-cart'
import {
	reversePortalQuoteLocation,
	searchPortalQuoteLocations,
} from '../../lib/server/quote-location'
import { submitQuoteRequest } from '../../lib/server/quote-requests'
import { getCustomerProfile } from '../../lib/server/settings'
import { unavailableItemNamesFromError } from '../../lib/unavailable-quote-items'
import { useDraftQuoteStore } from '../../stores/draft-quote'

const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CAIRO_TIME_ZONE = 'Africa/Cairo'

type PortalQuoteFlowStep = 'agreement' | 'contact' | 'delivery' | 'location'
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
	const quoteItems = useMemo(
		() =>
			toDraftQuoteRequestItemPayloads(items, {
				isArabic: i18n.language === 'ar',
			}),
		[i18n.language, items],
	)
	const [phase, setPhase] = useState<PortalQuoteFlowPhase>('loading')
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
		setLocationQuery('')
		setLocationResults([])
		setNewAddress(EMPTY_ADDRESS)
		setMapFocusPoint(null)
		setDeliveryAddress(null)
		setDeliveryDate(firstDeliveryDay())
		setDeliveryWindow(null)
		setAgreementAccepted(false)
		setIdempotencyKey(window.crypto.randomUUID())

		void getCustomerProfile()
			.then((profile) => {
				if (!active) return
				setContactEmail(profile.email ?? '')
				setContactPhone(toEgyptMobileInput(profile.phone ?? ''))
				setPhase('location')
			})
			.catch(() => {
				if (!active) return
				setError(t('quoteFlow.errors.defaults'))
				setPhase('failure')
			})

		return () => {
			active = false
		}
	}, [isOpen, t])

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
			!newAddress.governorate.trim()
		) {
			setError(t('quoteFlow.location.addressRequired'))
			return
		}
		setDeliveryAddress({
			area: newAddress.area.trim() || newAddress.city.trim(),
			city: newAddress.city.trim(),
			governorate: newAddress.governorate.trim(),
			latitude: newAddress.latitude,
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

	function goBack() {
		setError(null)
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
		currentStep === 'location'
			? continueFromLocation
			: currentStep === 'delivery'
				? continueFromDelivery
				: currentStep === 'contact'
					? continueFromContact
					: submitQuote

	if (!isOpen) return null

	return (
		<QuoteFlowDialog
			currentStep={currentStep}
			error={error}
			isOpen={isOpen}
			namespace="portal"
			nextIsSubmit={currentStep === 'agreement'}
			nextLabel={
				currentStep === 'agreement'
					? t('quoteFlow.submit')
					: t('quoteFlow.next')
			}
			onBack={currentStep && currentStep !== 'location' ? goBack : undefined}
			onClose={onClose}
			onNext={currentStep ? nextAction : undefined}
			pending={pending}
			terminalAction={phase === 'failure' || phase === 'success'}
		>
			<QuoteFlowContentProvider namespace="portal">
				{phase === 'loading' && <FlowLoading />}
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
		phase === 'location' ||
		phase === 'delivery' ||
		phase === 'contact' ||
		phase === 'agreement'
	)
}
