import {
	getQuoteCartFingerprint,
	toQuoteRequestItemPayloads,
} from '@hyperquote/quote-cart'
import {
	isEgyptMobileInput,
	type QuoteDeliveryWindow,
	type QuoteLocationSearchResult,
	type QuoteRequestAddress,
	toEgyptMobileInput,
} from '@hyperquote/quote-cart/checkout'
import { QuoteFlowDialog } from '@hyperquote/ui/quote-flow/QuoteFlowDialog'
import {
	AgreementStep,
	ContactStep,
	DeliveryStep,
	FlowError,
	FlowFailure,
	FlowInlineLoading,
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
import { useQuoteCart } from '../../hooks/useQuoteCart'
import { useQuoteRequestFlow } from '../../hooks/useQuoteRequestFlow'
import { useWebsiteQuoteDraftSave } from '../../hooks/useWebsiteQuoteDraftSave'
import {
	createQuoteRequestAddress,
	getWebsiteQuoteCheckoutDefaults,
	reverseWebsiteQuoteLocation,
	searchWebsiteQuoteLocations,
} from '../../lib/quote-checkout'
import { submitWebsiteQuoteRequest } from '../../lib/quote-requests'
import { QuoteAuthGate } from './QuoteAuthGate'

const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CAIRO_TIME_ZONE = 'Africa/Cairo'

type QuoteFlowStep = 'agreement' | 'contact' | 'delivery' | 'location'
type QuoteFlowPhase =
	| QuoteFlowStep
	| 'auth'
	| 'draft-success'
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

export function QuoteRequestDialog() {
	const { t, i18n } = useTranslation('website')
	const isArabic = i18n.language === 'ar'
	const isOpen = useQuoteRequestFlow((state) => state.isOpen)
	const intent = useQuoteRequestFlow((state) => state.intent)
	const source = useQuoteRequestFlow((state) => state.source)
	const close = useQuoteRequestFlow((state) => state.close)
	const savedDraft = useQuoteRequestFlow((state) => state.savedDraft)
	const clearSavedDraft = useQuoteRequestFlow((state) => state.clearSavedDraft)
	const items = useQuoteCart((state) => state.items)
	const globalNote = useQuoteCart((state) => state.globalNote)
	const clearCart = useQuoteCart((state) => state.clear)
	const draftSave = useWebsiteQuoteDraftSave()
	const saveDraftRef = useRef(draftSave.save)
	const openSessionRef = useRef('')

	const [phase, setPhase] = useState<QuoteFlowPhase>('loading')
	const [addresses, setAddresses] = useState<QuoteRequestAddress[]>([])
	const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
		null,
	)
	const [deliveryAddress, setDeliveryAddress] =
		useState<QuoteRequestAddress | null>(null)
	const [newAddress, setNewAddress] = useState<NewAddressDraft>(EMPTY_ADDRESS)
	const [locationQuery, setLocationQuery] = useState('')
	const [locationResults, setLocationResults] = useState<
		QuoteLocationSearchResult[]
	>([])
	const [locationSearching, setLocationSearching] = useState(false)
	const [locationResolving, setLocationResolving] = useState(false)
	const [deliveryDate, setDeliveryDate] = useState<DateValue>(() =>
		firstDeliveryDay(),
	)
	const [deliveryWindow, setDeliveryWindow] =
		useState<QuoteDeliveryWindow | null>(null)
	const [contactEmail, setContactEmail] = useState('')
	const [contactPhone, setContactPhone] = useState('')
	const [agreementAccepted, setAgreementAccepted] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [pending, setPending] = useState(false)
	const [successReference, setSuccessReference] = useState('')
	const [idempotencyKey, setIdempotencyKey] = useState('')

	const earliestDate = useMemo(() => firstDeliveryDay(), [])
	const latestDate = useMemo(
		() => earliestDate.add({ months: 2 }),
		[earliestDate],
	)
	const quoteItems = useMemo(
		() => toQuoteRequestItemPayloads(items, { isArabic }),
		[isArabic, items],
	)
	const cartFingerprint = useMemo(
		() => getQuoteCartFingerprint(items, globalNote),
		[globalNote, items],
	)

	useEffect(() => {
		saveDraftRef.current = draftSave.save
	}, [draftSave.save])

	useEffect(() => {
		if (!isOpen) {
			openSessionRef.current = ''
			return
		}
		const sessionKey = `${intent}:${source}`
		if (openSessionRef.current === sessionKey) return
		openSessionRef.current = sessionKey
		let active = true

		setPhase('loading')
		setError(null)
		setPending(false)
		setSuccessReference('')
		setLocationResults([])
		setLocationQuery('')
		setNewAddress(EMPTY_ADDRESS)
		setDeliveryAddress(null)
		setDeliveryDate(firstDeliveryDay())
		setDeliveryWindow(null)
		setAgreementAccepted(false)
		setIdempotencyKey(window.crypto.randomUUID())

		void getWebsiteQuoteCheckoutDefaults()
			.then(async (result) => {
				if (!active) return
				if (!result.success) {
					setPhase('auth')
					return
				}
				setAddresses(result.addresses)
				const defaultAddress =
					result.addresses.find((address) => address.isDefault) ??
					result.addresses[0] ??
					null
				setSelectedAddressId(defaultAddress?.id ?? null)
				setContactEmail(result.email)
				setContactPhone(toEgyptMobileInput(result.phone))

				if (intent === 'save') {
					const saveResult = await saveDraftRef.current()
					if (!active) return
					if (saveResult.status === 'saved') {
						setSuccessReference(saveResult.reference)
						setPhase('draft-success')
						return
					}
					if (saveResult.status === 'auth_required') {
						setPhase('auth')
						return
					}
					setError(
						saveResult.status === 'error'
							? saveResult.message
							: t('quoteFlow.errors.empty'),
					)
					setPhase('failure')
					return
				}

				setPhase('location')
			})
			.catch(() => {
				if (!active) return
				setError(t('quoteFlow.errors.defaults'))
				setPhase('auth')
			})

		return () => {
			active = false
		}
	}, [intent, isOpen, source, t])

	async function finishAuthentication() {
		setPending(true)
		setError(null)
		try {
			const result = await getWebsiteQuoteCheckoutDefaults()
			if (!result.success) {
				setError(t('quoteFlow.errors.defaults'))
				return
			}
			setAddresses(result.addresses)
			const defaultAddress =
				result.addresses.find((address) => address.isDefault) ??
				result.addresses[0] ??
				null
			setSelectedAddressId(defaultAddress?.id ?? null)
			setContactEmail(result.email)
			setContactPhone(toEgyptMobileInput(result.phone))

			if (intent === 'save') {
				const saveResult = await draftSave.save()
				if (saveResult.status === 'saved') {
					setSuccessReference(saveResult.reference)
					setPhase('draft-success')
					return
				}
				setError(
					saveResult.status === 'error'
						? saveResult.message
						: t('quoteFlow.errors.save'),
				)
				setPhase('failure')
				return
			}
			setPhase('location')
		} catch {
			setError(t('quoteFlow.errors.defaults'))
		} finally {
			setPending(false)
		}
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
			const result = await searchWebsiteQuoteLocations({
				data: { locale: isArabic ? 'ar' : 'en', query },
			})
			if (!result.success) {
				if (result.error === 'not_authenticated') {
					setPhase('auth')
					return
				}
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
		setSelectedAddressId(null)
		setNewAddress({
			area: result.area,
			city: result.city,
			governorate: result.governorate,
			latitude: result.latitude,
			longitude: result.longitude,
			street: result.street,
		})
		setLocationResults([])
		setLocationQuery(result.displayName)
		setError(null)
	}

	async function chooseMapPoint(point: QuoteLocationPoint) {
		setSelectedAddressId(null)
		setNewAddress((current) => ({
			...current,
			latitude: point.latitude,
			longitude: point.longitude,
		}))
		setLocationResolving(true)
		setError(null)
		try {
			const result = await reverseWebsiteQuoteLocation({
				data: {
					latitude: point.latitude,
					locale: isArabic ? 'ar' : 'en',
					longitude: point.longitude,
				},
			})
			if (!result.success) {
				if (result.error === 'not_authenticated') {
					setPhase('auth')
					return
				}
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
			setError(t('quoteFlow.location.reverseError'))
		} finally {
			setLocationResolving(false)
		}
	}

	async function continueFromLocation() {
		setError(null)
		const selectedAddress = addresses.find(
			(address) => address.id === selectedAddressId,
		)
		if (selectedAddress) {
			setDeliveryAddress(selectedAddress)
			setPhase('delivery')
			return
		}
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
		setPending(true)
		try {
			const result = await createQuoteRequestAddress({
				data: {
					area: newAddress.area.trim(),
					city: newAddress.city.trim(),
					governorate: newAddress.governorate.trim(),
					latitude: newAddress.latitude,
					longitude: newAddress.longitude,
					street: newAddress.street.trim(),
				},
			})
			if (!result.success) {
				if (
					result.error === 'not_authenticated' ||
					result.error === 'customer_required'
				) {
					setPhase('auth')
					return
				}
				setError(t('quoteFlow.location.createError'))
				return
			}
			setAddresses((current) => [...current, result.address])
			setSelectedAddressId(result.address.id)
			setDeliveryAddress(result.address)
			setPhase('delivery')
		} catch {
			setError(t('quoteFlow.location.createError'))
		} finally {
			setPending(false)
		}
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
			const result = await submitWebsiteQuoteRequest({
				data: {
					agreementAccepted: true,
					contactEmail,
					contactPhone: `+20${contactPhone}`,
					deliveryAddressId: deliveryAddress.id,
					deliveryDate: deliveryDate.toString(),
					draftId:
						savedDraft?.fingerprint === cartFingerprint
							? savedDraft.draftId
							: undefined,
					idempotencyKey: idempotencyKey || window.crypto.randomUUID(),
					items: quoteItems,
					notes: globalNote.trim() || undefined,
					preferredDeliveryWindow: deliveryWindow,
				},
			})
			if (result.success) {
				setSuccessReference(result.reference)
				clearCart()
				clearSavedDraft()
				window.dispatchEvent(new Event('hyperquote-account-updated'))
				setPhase('success')
				return
			}
			if (
				result.error === 'not_authenticated' ||
				result.error === 'customer_required'
			) {
				setPhase('auth')
				return
			}
			if (result.error === 'invalid_details') {
				setError(t('quoteFlow.errors.invalidDetails'))
				setPhase('location')
				return
			}
			if (result.error === 'items_unavailable') {
				setError(
					t('cart.unavailableItems', {
						items: result.unavailableItems?.join(', ') || t('cart.title'),
					}),
				)
				return
			}
			setError(t('quoteFlow.errors.submit'))
		} catch {
			setError(t('quoteFlow.errors.submit'))
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

	const currentStep = isQuoteFlowStep(phase) ? phase : null
	const mapPoint =
		newAddress.latitude !== null && newAddress.longitude !== null
			? {
					latitude: newAddress.latitude,
					longitude: newAddress.longitude,
				}
			: selectedAddressPoint(addresses, selectedAddressId)

	if (!isOpen) return null

	const nextAction =
		currentStep === 'location'
			? continueFromLocation
			: currentStep === 'delivery'
				? continueFromDelivery
				: currentStep === 'contact'
					? continueFromContact
					: submitQuote

	return (
		<QuoteFlowDialog
			currentStep={currentStep}
			error={error}
			isOpen={isOpen}
			namespace="website"
			nextIsSubmit={currentStep === 'agreement'}
			nextLabel={
				currentStep === 'agreement'
					? t('quoteFlow.submit')
					: t('quoteFlow.next')
			}
			onBack={currentStep && currentStep !== 'location' ? goBack : undefined}
			onClose={close}
			onNext={currentStep ? nextAction : undefined}
			pending={pending}
			terminalAction={
				phase === 'draft-success' || phase === 'failure' || phase === 'success'
			}
		>
			<QuoteFlowContentProvider namespace="website">
				{phase === 'loading' && <FlowLoading />}
				{phase === 'auth' && (
					<div className="flex min-h-full items-center justify-center px-5 py-10 sm:px-8">
						<div className="w-full">
							<QuoteAuthGate onAuthenticated={finishAuthentication} />
							{pending && <FlowInlineLoading />}
							{error && <FlowError>{error}</FlowError>}
						</div>
					</div>
				)}
				{phase === 'location' && (
					<LocationStep
						addresses={addresses}
						locationQuery={locationQuery}
						locationResolving={locationResolving}
						locationResults={locationResults}
						locationSearching={locationSearching}
						mapPoint={mapPoint}
						newAddress={newAddress}
						onAddressFieldChange={(field, value) =>
							setNewAddress((current) => ({ ...current, [field]: value }))
						}
						onLocationQueryChange={setLocationQuery}
						onMapPointChange={chooseMapPoint}
						onSearch={searchLocation}
						onSearchResult={chooseLocationResult}
						onSelectAddress={(address) => {
							setSelectedAddressId(address.id)
							setNewAddress(EMPTY_ADDRESS)
							setError(null)
						}}
						selectedAddressId={selectedAddressId}
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
				{phase === 'draft-success' && (
					<FlowSuccess
						body={t('quoteFlow.success.draftBody')}
						heading={t('quoteFlow.success.draftHeading')}
						reference={successReference}
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

function isQuoteFlowStep(phase: QuoteFlowPhase): phase is QuoteFlowStep {
	return (
		phase === 'location' ||
		phase === 'delivery' ||
		phase === 'contact' ||
		phase === 'agreement'
	)
}

function selectedAddressPoint(
	addresses: QuoteRequestAddress[],
	selectedAddressId: string | null,
): QuoteLocationPoint | null {
	const address = addresses.find((entry) => entry.id === selectedAddressId)
	if (!address || address.latitude === null || address.longitude === null) {
		return null
	}
	return { latitude: address.latitude, longitude: address.longitude }
}
