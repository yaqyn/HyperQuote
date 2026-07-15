import {
	getQuoteCartFingerprint,
	toQuoteRequestItemPayloads,
} from '@hyperquote/quote-cart'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveWebsiteQuoteDraft } from '../lib/quote-requests'
import { useQuoteCart } from './useQuoteCart'
import { useQuoteRequestFlow } from './useQuoteRequestFlow'

export type WebsiteQuoteDraftSaveResult =
	| { status: 'saved'; reference: string }
	| { status: 'auth_required' }
	| { status: 'empty' }
	| { status: 'error'; message: string }

function defaultDraftName(baseName: string, isArabic: boolean) {
	const date = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(new Date())
	return `${baseName} ${date}`
}

export function useWebsiteQuoteDraftSave() {
	const { t, i18n } = useTranslation('website')
	const items = useQuoteCart((state) => state.items)
	const globalNote = useQuoteCart((state) => state.globalNote)
	const savedDraft = useQuoteRequestFlow((state) => state.savedDraft)
	const recordSavedDraft = useQuoteRequestFlow(
		(state) => state.recordSavedDraft,
	)
	const [isSaving, setIsSaving] = useState(false)

	const fingerprint = useMemo(
		() => getQuoteCartFingerprint(items, globalNote),
		[globalNote, items],
	)
	const quoteItems = useMemo(
		() =>
			toQuoteRequestItemPayloads(items, {
				isArabic: i18n.language === 'ar',
			}),
		[i18n.language, items],
	)
	const isSaved =
		quoteItems.length > 0 && savedDraft?.fingerprint === fingerprint

	async function save(): Promise<WebsiteQuoteDraftSaveResult> {
		if (quoteItems.length === 0) return { status: 'empty' }
		if (isSaved && savedDraft) {
			return { status: 'saved', reference: savedDraft.reference }
		}

		const name =
			savedDraft?.name ??
			defaultDraftName(t('cart.defaultDraftName'), i18n.language === 'ar')
		setIsSaving(true)
		try {
			const result = await saveWebsiteQuoteDraft({
				data: {
					draftId: savedDraft?.draftId,
					items: quoteItems,
					name,
					notes: globalNote.trim() || undefined,
				},
			})
			if (result.success) {
				recordSavedDraft({
					draftId: result.requestId,
					fingerprint,
					name,
					reference: result.reference,
				})
				window.dispatchEvent(new Event('hyperquote-account-updated'))
				return { status: 'saved', reference: result.reference }
			}
			if (
				result.error === 'not_authenticated' ||
				result.error === 'customer_required'
			) {
				return { status: 'auth_required' }
			}
			if (result.error === 'items_unavailable') {
				return {
					status: 'error',
					message: t('cart.unavailableItems', {
						items: result.unavailableItems?.join(', ') || name,
					}),
				}
			}
			return { status: 'error', message: t('cart.saveDraftFailed') }
		} catch {
			return { status: 'error', message: t('cart.saveDraftFailed') }
		} finally {
			setIsSaving(false)
		}
	}

	return { isSaved, isSaving, save }
}
