import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResponseComposer } from '../components/customer-service/ResponseComposer'
import '../lib/i18n'
import type { Conversation } from '../types/customer-service'

const customerServiceMocks = vi.hoisted(() => ({
	sendReply: vi.fn(async () => undefined),
}))

vi.mock('../lib/server/customer-service', () => ({
	sendReply: customerServiceMocks.sendReply,
}))

let activeRoot: Root | null = null
let activeContainer: HTMLDivElement | null = null

const emailConversation: Conversation = {
	assignedTo: null,
	assignedToName: null,
	channel: 'email',
	createdAt: '2026-05-25T10:00:00.000Z',
	customer: {
		company: 'Local Customer',
		companyAr: 'Local Customer',
		email: 'customer@example.com',
		firstContactAt: '2026-05-25T10:00:00.000Z',
		id: 'customer-1',
		name: 'Local Customer',
		nameAr: 'Local Customer',
		phone: null,
		recordType: 'external',
		satisfactionAvg: null,
		totalConversations: 1,
	},
	id: 'ticket:local-email-ticket',
	lastMessageAt: '2026-05-25T10:00:00.000Z',
	lastMessagePreview: 'Need help',
	linkedOrders: [],
	linkedQuotes: [],
	messages: [],
	priority: 'medium',
	slaBreached: false,
	slaDeadline: null,
	status: 'open',
	subject: 'Need help',
	tags: [],
	ticketId: 'TK-LOCAL-001',
	unreadCount: 1,
}

afterEach(() => {
	if (activeRoot) {
		act(() => activeRoot?.unmount())
		activeRoot = null
	}
	activeContainer?.remove()
	activeContainer = null
	vi.clearAllMocks()
})

async function renderEmailComposer() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})
	activeContainer = document.createElement('div')
	document.body.appendChild(activeContainer)
	activeRoot = createRoot(activeContainer)

	await act(async () => {
		activeRoot?.render(
			<QueryClientProvider client={queryClient}>
				<ResponseComposer conversation={emailConversation} mode="email" />
			</QueryClientProvider>,
		)
	})

	return activeContainer
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
	const descriptor = Object.getOwnPropertyDescriptor(
		window.HTMLTextAreaElement.prototype,
		'value',
	)
	descriptor?.set?.call(textarea, value)
	textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

function findButtonByText(container: HTMLElement, text: string) {
	const button = Array.from(container.querySelectorAll('button')).find(
		(candidate) => candidate.textContent?.trim() === text,
	)
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error(`Button not found: ${text}`)
	}
	return button
}

function findButtonByLabel(container: HTMLElement, label: string) {
	const button = container.querySelector<HTMLButtonElement>(
		`button[aria-label="${label}"]`,
	)
	if (!button) {
		throw new Error(`Button not found: ${label}`)
	}
	return button
}

describe('ResponseComposer email replies', () => {
	it('confirms before sending and keeps the draft when cancelled', async () => {
		const container = await renderEmailComposer()
		const textarea = container.querySelector('textarea')

		expect(textarea).toBeInstanceOf(HTMLTextAreaElement)
		if (!(textarea instanceof HTMLTextAreaElement)) return

		await act(async () => {
			setTextareaValue(textarea, 'Thanks, we are checking this now.')
		})

		await act(async () => {
			const mobileReplyButton = findButtonByLabel(container, 'Reply')
			expect(mobileReplyButton.textContent?.trim()).toBe('')
			mobileReplyButton.click()
		})

		expect(customerServiceMocks.sendReply).not.toHaveBeenCalled()
		expect(container.textContent).toContain('Send this reply?')
		const mobileConfirmActions = container.querySelector<HTMLElement>(
			'[data-mobile-email-confirm-actions="true"]',
		)
		expect(mobileConfirmActions).toBeInTheDocument()
		expect(
			Array.from(mobileConfirmActions?.querySelectorAll('button') ?? []).map(
				(button) => button.textContent?.trim(),
			),
		).toEqual(['Cancel', 'Send'])

		await act(async () => {
			findButtonByText(container, 'Cancel').click()
		})

		expect(container.textContent).not.toContain('Send this reply?')
		expect(textarea.value).toBe('Thanks, we are checking this now.')

		await act(async () => {
			findButtonByLabel(container, 'Reply').click()
		})
		await act(async () => {
			const actions = container.querySelector<HTMLElement>(
				'[data-mobile-email-confirm-actions="true"]',
			)
			expect(actions).toBeInTheDocument()
			if (!actions) return
			findButtonByText(actions, 'Send').click()
			await Promise.resolve()
		})

		expect(customerServiceMocks.sendReply).toHaveBeenCalledTimes(1)
		expect(customerServiceMocks.sendReply).toHaveBeenCalledWith({
			data: {
				channel: 'email',
				content: 'Thanks, we are checking this now.',
				conversationId: 'ticket:local-email-ticket',
			},
		})
	})
})
