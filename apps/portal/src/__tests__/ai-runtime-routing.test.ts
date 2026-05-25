import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd().endsWith('apps/portal')
	? join(process.cwd(), '../..')
	: process.cwd()

function readRepoFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

function sliceFrom(source: string, startNeedle: string, endNeedle: string) {
	const start = source.indexOf(startNeedle)
	const end = source.indexOf(endNeedle, start)
	expect(start, `${startNeedle} not found`).toBeGreaterThanOrEqual(0)
	expect(end, `${endNeedle} not found`).toBeGreaterThan(start)
	return source.slice(start, end)
}

describe('AI runtime routing', () => {
	it('calls Groq for normal portal chat before static fallback text', () => {
		const source = readRepoFile('apps/portal/src/lib/chat.ts')
		const chatBranch = sliceFrom(
			source,
			"if (result.context.type === 'chat') {",
			"if (result.context.type === 'public_docs') {",
		)

		const modelCall = chatBranch.indexOf(
			'streamWithCustomEvents(modelMessages, LYON_PORTAL, customEvents)',
		)
		const fallback = chatBranch.indexOf('return textOnlyChunks(fallbackText')

		expect(modelCall).toBeGreaterThanOrEqual(0)
		expect(fallback).toBeGreaterThan(modelCall)
	})

	it('calls Groq for website and internal chat before simple fallback copy', () => {
		const websiteSource = readRepoFile('apps/website/src/lib/chat.ts')
		const websiteChatBranch = sliceFrom(
			websiteSource,
			"if (route.action === 'chat') {",
			'} else if (aiEnabled) {',
		)
		expect(websiteChatBranch.indexOf('streamChat(modelMessages')).toBeLessThan(
			websiteChatBranch.indexOf('simpleWebsiteChatAnswer(modelMessages)'),
		)

		const internalSource = readRepoFile('apps/internal/src/lib/ai-chat.ts')
		expect(internalSource).toContain('if (await isAIEnabled()) {')
		expect(internalSource).toContain('completeChatWithTools')
		expect(internalSource).toContain('search_internal_records')
	})

	it('loads operator secrets for direct website, portal, and internal dev', () => {
		for (const app of ['website', 'portal', 'internal']) {
			const packageJson = JSON.parse(
				readRepoFile(`apps/${app}/package.json`),
			) as { scripts?: { dev?: string } }
			expect(packageJson.scripts?.dev).toContain(
				'../../scripts/with-dev-secrets.mjs',
			)
		}

		const wrapper = readRepoFile('scripts/with-dev-secrets.mjs')
		expect(wrapper).toContain("'run'")
		expect(wrapper).toContain('--env=dev')
		expect(wrapper).toContain('--path=')
		expect(wrapper).toContain('HYPERQUOTE_INFISICAL_PATH')
		expect(wrapper).toContain("'--recursive'")
	})

	it('grounds portal order answers in the sales quote site address', () => {
		const source = readRepoFile('apps/portal/src/lib/chat.ts')

		expect(source).toContain("SALES_QUOTE_ADDRESS_LABEL = 'Sales quote site'")
		expect(source).toContain('customer_addresses (')
		expect(source).toContain('Site / Dropoff')
		expect(source).toContain('do not substitute profile/default addresses')
	})

	it('emits website AI navigation buttons that both website chat surfaces render', () => {
		const websiteChatSource = readRepoFile('apps/website/src/lib/chat.ts')
		const websitePromptSource = readRepoFile('packages/ai/src/prompts.ts')
		const websiteHookSource = readRepoFile(
			'apps/website/src/hooks/useAIChat.ts',
		)
		const bubbleSource = readRepoFile(
			'apps/website/src/components/chat/ChatMessages.tsx',
		)
		const heroSource = readRepoFile(
			'apps/website/src/components/home/LyonHeroChat.tsx',
		)

		expect(websiteChatSource).toContain('websiteNavigationButtons')
		expect(websiteChatSource).toContain("type: 'action_button'")
		expect(websiteChatSource).not.toContain("label: 'Open ")
		expect(websiteChatSource).not.toContain('label: `Open ')
		expect(websiteChatSource).toContain('WEBSITE_DOCS_NAV_PATTERN')
		expect(websiteChatSource).toContain('learn|learning')
		expect(websiteChatSource).toContain('websiteDirectNavigationButtons')
		expect(websiteChatSource).toContain('websiteNavigationDirectAnswer')
		expect(
			websiteChatSource.indexOf('websiteDirectNavigationButtons(userText)'),
		).toBeLessThan(websiteChatSource.indexOf('routeWebsitePublicChat'))
		expect(websiteChatSource).toContain("href: '/support#faq'")
		expect(websiteChatSource).toContain("href: '/support#contact'")
		expect(websiteChatSource).toContain("href: '/legal/terms'")
		expect(websiteChatSource).toContain("href: '/legal/privacy'")
		expect(websiteChatSource).toContain("href: '/careers'")
		expect(websiteChatSource).toContain("href: '/about'")
		expect(websiteChatSource).toContain('WEBSITE_MARKET_TOPIC_PATTERN')
		expect(websiteChatSource).toContain('wood|lumber|timber')
		expect(websitePromptSource).toMatch(/stay warm and natural/i)
		expect(websitePromptSource).toContain(
			'Never recommend, compare, cite, or name outside businesses',
		)
		expect(websiteHookSource).toContain('websiteActionsFromChunks')
		expect(bubbleSource).toContain(
			'<ChatActionButtons actions={msg.actions} />',
		)
		expect(heroSource).toContain('<ChatActionButtons actions={msg.actions} />')
	})
})
