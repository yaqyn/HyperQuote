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
		expect(
			internalSource.indexOf(
				'if (await isAIEnabled()) return streamChat(messages, OPS_ASSISTANT)',
			),
		).toBeLessThan(
			internalSource.indexOf(
				'const simpleAnswer = simpleEmployeeChatAnswer(options.userText)',
			),
		)
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
		expect(wrapper).toContain("['run', '--recursive', '--'")
		expect(wrapper).toContain('GROQ_API_KEY')
		expect(wrapper).toContain('HQ_GROQ_API_KEY')
	})
})
