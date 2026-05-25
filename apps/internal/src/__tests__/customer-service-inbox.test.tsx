import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { SupportInbox } from '../components/customer-service/SupportInbox'
import '../lib/i18n'
import { useSupportStore } from '../stores/customer-service'
import type { Conversation } from '../types/customer-service'

let activeRoot: Root | null = null
let activeContainer: HTMLDivElement | null = null

function makeConversation(
	overrides: Partial<Conversation> & Pick<Conversation, 'id' | 'subject'>,
): Conversation {
	const timestamp = overrides.lastMessageAt ?? '2026-05-25T10:00:00.000Z'
	const { id, ...rest } = overrides
	return {
		assignedTo: null,
		assignedToName: null,
		channel: 'email',
		createdAt: timestamp,
		customer: {
			company: 'Local Customer',
			companyAr: 'Local Customer',
			email: 'customer@example.com',
			firstContactAt: '2026-05-25T10:00:00.000Z',
			id: `${id}-customer`,
			name: 'Local Customer',
			nameAr: 'Local Customer',
			phone: null,
			recordType: 'external',
			satisfactionAvg: null,
			totalConversations: 1,
		},
		id,
		lastMessageAt: timestamp,
		lastMessagePreview: overrides.lastMessagePreview ?? overrides.subject,
		linkedOrders: [],
		linkedQuotes: [],
		messages: [],
		priority: 'medium',
		slaBreached: false,
		slaDeadline: null,
		status: 'open',
		tags: [],
		ticketId: null,
		unreadCount: 0,
		...rest,
	}
}

afterEach(() => {
	if (activeRoot) {
		act(() => activeRoot?.unmount())
		activeRoot = null
	}
	activeContainer?.remove()
	activeContainer = null
	useSupportStore.setState({
		overlayCloseHandler: null,
		searchQuery: '',
		selectedConversationId: null,
		statusFilter: 'all',
	})
})

async function renderInbox(conversations: Conversation[]) {
	activeContainer = document.createElement('div')
	document.body.appendChild(activeContainer)
	activeRoot = createRoot(activeContainer)

	await act(async () => {
		activeRoot?.render(
			<SupportInbox
				conversations={conversations}
				selectedId={null}
				autoSelect={false}
			/>,
		)
	})

	return activeContainer
}

describe('SupportInbox email queue', () => {
	it('puts email first, marks other tabs soon, and groups closed tickets below active mail', async () => {
		const container = await renderInbox([
			makeConversation({
				id: 'read-email',
				lastMessageAt: '2026-05-25T11:00:00.000Z',
				subject: 'Read email ticket',
				unreadCount: 0,
			}),
			makeConversation({
				id: 'closed-email',
				lastMessageAt: '2026-05-25T12:00:00.000Z',
				status: 'closed',
				subject: 'Closed email ticket',
				unreadCount: 4,
			}),
			makeConversation({
				id: 'unread-email',
				lastMessageAt: '2026-05-25T09:00:00.000Z',
				subject: 'Unread email ticket',
				unreadCount: 1,
			}),
			makeConversation({
				channel: 'whatsapp',
				id: 'whatsapp-ticket',
				subject: 'WhatsApp ticket',
			}),
		])

		const tabs = Array.from(
			container.querySelectorAll<HTMLButtonElement>('[data-channel-tab]'),
		).slice(0, 3)
		expect(tabs.map((tab) => tab.dataset.channelTab)).toEqual([
			'email',
			'whatsapp',
			'live',
		])
		expect(tabs[1]).toHaveTextContent('Coming soon')
		expect(tabs[1]).toBeDisabled()
		expect(tabs[2]).toHaveTextContent('Coming soon')
		expect(tabs[2]).toBeDisabled()

		const text = container.textContent ?? ''
		const unreadIndex = text.indexOf('Unread email ticket')
		const readIndex = text.indexOf('Read email ticket')
		const separatorIndex = text.indexOf('Closed')
		const closedIndex = text.indexOf('Closed email ticket')

		expect(unreadIndex).toBeGreaterThan(-1)
		expect(readIndex).toBeGreaterThan(unreadIndex)
		expect(separatorIndex).toBeGreaterThan(readIndex)
		expect(closedIndex).toBeGreaterThan(separatorIndex)
		expect(text).not.toContain('WhatsApp ticket')
		expect(
			container.querySelector('[data-email-closed-separator="true"]'),
		).toBeInTheDocument()
	})
})
