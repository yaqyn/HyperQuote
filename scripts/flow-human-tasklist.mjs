#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'

const FLOW_PATH = 'Flow.md'
const OUTPUT_PATH = 'Flow.human-tasklist.md'

const flow = readFileSync(FLOW_PATH, 'utf8')
const bullets = parseBullets(flow)
const rows = bullets.map((bullet) => ({
	...bullet,
	method: testMethodFor(bullet),
	persona: personaFor(bullet),
	interactions: interactionsFor(bullet),
	edgeCases: edgeCasesFor(bullet),
	backendProof: backendProofFor(bullet),
}))

if (process.argv.includes('--check')) {
	const tasklist = readFileSync(OUTPUT_PATH, 'utf8')
	const coverage = new Map()
	for (const line of tasklist.split('\n')) {
		const match = /^\| \[[x!~ ]\] \| Flow\.md:(\d+) \|/.exec(line)
		if (!match) continue
		const flowLine = Number(match[1])
		const count = coverage.get(flowLine) ?? 0
		coverage.set(flowLine, count + 1)
	}
	const duplicates = rows.filter((row) => {
		return (coverage.get(row.line) ?? 0) !== 1
	})
	const staleText = rows.filter((row) => {
		const expectedText = escapeTable(row.text)
		return !tasklist
			.split('\n')
			.some(
				(line) =>
					line.startsWith('| ') &&
					line.includes(`| Flow.md:${row.line} |`) &&
					line.includes(`| ${expectedText} |`),
			)
	})
	const extraRows = [...coverage.keys()].filter(
		(line) => !rows.some((row) => row.line === line),
	)
	if (duplicates.length > 0 || staleText.length > 0 || extraRows.length > 0) {
		console.error(
			JSON.stringify(
				{
					duplicateOrMissingLines: duplicates.map((row) => row.line),
					staleTextLines: staleText.map((row) => row.line),
					extraRows,
				},
				null,
				2,
			),
		)
		process.exit(1)
	}
	console.log(`Flow tasklist coverage ok: ${rows.length} Flow bullets.`)
	process.exit(0)
}

const output = render(rows)
if (process.argv.includes('--write')) {
	writeFileSync(OUTPUT_PATH, output)
	console.log(`Wrote ${OUTPUT_PATH} with ${rows.length} Flow bullets.`)
} else {
	process.stdout.write(output)
}

function parseBullets(markdown) {
	const parsed = []
	const lines = markdown.split('\n')
	let h2 = ''
	let h3 = ''
	let h4 = ''
	let current = null

	for (const [index, rawLine] of lines.entries()) {
		const line = index + 1
		const h2Match = /^## (.+)$/.exec(rawLine)
		if (h2Match) {
			flush()
			h2 = h2Match[1].trim()
			h3 = ''
			h4 = ''
			continue
		}
		const h3Match = /^### (.+)$/.exec(rawLine)
		if (h3Match) {
			flush()
			h3 = h3Match[1].trim()
			h4 = ''
			continue
		}
		const h4Match = /^#### (.+)$/.exec(rawLine)
		if (h4Match) {
			flush()
			h4 = h4Match[1].trim()
			continue
		}
		const bullet = /^- (.+)$/.exec(rawLine)
		if (bullet) {
			flush()
			current = {
				area: [h2, h3, h4].filter(Boolean).join(' / '),
				h2,
				h3,
				h4,
				line,
				text: bullet[1].trim(),
			}
			continue
		}
		if (current && /^\s{2,}\S/.test(rawLine)) {
			current.text = `${current.text} ${rawLine.trim()}`
		}
	}
	flush()
	return parsed

	function flush() {
		if (!current) return
		parsed.push(current)
		current = null
	}
}

function personaFor(bullet) {
	const lower = `${bullet.area} ${bullet.text}`.toLowerCase()
	if (lower.includes('visitor') || lower.includes('public')) return 'visitor'
	if (lower.includes('customer service') || lower.includes('support')) {
		return 'customer_service_employee'
	}
	if (lower.includes('customer')) return 'customer'
	if (lower.includes('admin')) return 'admin'
	if (lower.includes('sales')) return 'sales_employee'
	if (lower.includes('inventory')) return 'inventory_employee'
	if (lower.includes('warehouse')) return 'warehouse_employee'
	if (lower.includes('finance')) return 'finance_employee'
	if (lower.includes('dispatch')) return 'dispatch_employee'
	if (lower.includes('driver')) return 'driver'
	if (lower.includes('ceo') || lower.includes('search')) return 'ceo'
	if (lower.includes('system') || lower.includes('backend')) return 'system'
	if (bullet.h2 === 'AI Agents') return 'ai_actor'
	return 'tester'
}

function testMethodFor(bullet) {
	const lower = `${bullet.area} ${bullet.text}`.toLowerCase()
	const methods = []
	if (bullet.h2 === 'Website' || lower.includes('website')) {
		methods.push('website browser')
	}
	if (bullet.h2 === 'Internal App' || lower.includes('internal')) {
		methods.push('internal browser')
	}
	if (bullet.h2 === 'Driver App' || lower.includes('driver')) {
		methods.push('driver browser')
	}
	if (lower.includes('portal') || lower.includes('customer-facing')) {
		methods.push('portal browser')
	}
	if (
		hasAny(lower, [
			'rls',
			'server-side',
			'transaction',
			'rpc',
			'source of truth',
			'audit',
			'history',
			'activity',
			'cannot',
			'must not',
			'only',
			'never',
			'requires',
		])
	) {
		methods.push('DB/RLS/RPC')
	}
	if (
		hasAny(lower, ['whatsapp', 'email', 'notification', 'provider', 'notified'])
	) {
		methods.push('provider fail-closed')
	}
	if (methods.length === 0) methods.push('browser + DB')
	return [...new Set(methods)].join(' + ')
}

function interactionsFor(bullet) {
	const lower = `${bullet.area} ${bullet.text}`.toLowerCase()
	const actions = [
		'Open the relevant app route as the allowed persona and record the exact visible loading, empty, populated, and error states.',
		'Perform the happy-path user action exactly as a human would: click every visible command for this requirement, type realistic values, and confirm the visible result.',
	]

	if (bullet.h2 === 'Website') {
		actions.push(
			'Check the same surface in English and Arabic for customer-facing labels, product names, categories, specs, units, and snapshots.',
		)
	}
	if (hasAny(lower, ['sign up', 'sign in', 'otp', 'auth', 'account'])) {
		actions.push(
			'Try valid login/signup, fake phone/OTP, invalid email/password, refresh after auth, sign out, and cross-app access attempts.',
		)
	}
	if (
		hasAny(lower, ['market', 'product', 'catalog', 'search', 'filter', 'sort'])
	) {
		actions.push(
			'Browse grid/list/detail, search, filter, sort, add a new admin product, edit it, deactivate it, and refresh Website/Portal to verify catalog changes.',
		)
	}
	if (hasAny(lower, ['cart', 'draft', 'saved', 'submit', 'order'])) {
		actions.push(
			'Add items, change quantities, remove items, save draft, abandon/reopen, submit, duplicate clicks, reload, and verify the order/draft appears in the correct panel.',
		)
	}
	if (
		hasAny(lower, [
			'portal order',
			'order detail',
			'save a submitted',
			'save a confirmed',
		])
	) {
		actions.push(
			'Open saved/submitted/confirmed order details, use Save as Draft from list and detail, verify source order is unchanged, then edit and submit the copied draft.',
		)
	}
	if (hasAny(lower, ['support', 'ticket', 'conversation', 'message'])) {
		actions.push(
			'Submit signed-out and signed-in tickets, omit required fields, use invalid contact values, reply/assign/close/reopen internally, and verify customer-service queue visibility.',
		)
	}
	if (bullet.h2 === 'Internal App') {
		actions.push(
			'Login with the exact role needed, open the named panel, click every panel button/menu/tab/state transition, and verify role-limited panels are not accessible.',
		)
	}
	if (bullet.h3 === 'Admin Panel') {
		actions.push(
			'Add, edit every field, remove/deactivate, export, cancel, confirm, and retry invalid values for every Admin entity: products, categories, suppliers, customers, employees, roles, drivers, trucks, pricing, addresses, projects, and customer records.',
		)
	}
	if (hasAny(lower, ['sales', 'quote builder', 'call notes'])) {
		actions.push(
			'Claim work, save/requeue, reject with and without proof, record call notes, add/remove/change items, confirm, cancel, and verify original submission history remains intact.',
		)
	}
	if (hasAny(lower, ['inventory', 'stock', 'reserve', 'refill', 'price'])) {
		actions.push(
			'Run stock below-minimum, refill, price update, proof upload, insufficient stock, reserve, release, and delivered-consumption branches.',
		)
	}
	if (hasAny(lower, ['finance', 'payment', 'partial'])) {
		actions.push(
			'Record 100 percent and 50 percent customer/supplier payments, invalid amounts, notes, follow-up visibility, and handoff to inventory or warehouse.',
		)
	}
	if (hasAny(lower, ['warehouse', 'loading', 'receiving', 'advisor'])) {
		actions.push(
			'Assign drivers/advisors, split loads, validate quantities, approve, reject with proof, leave issue states, and verify stock does not move before approval.',
		)
	}
	if (hasAny(lower, ['dispatch', 'delivery', 'fleet'])) {
		actions.push(
			'Inspect map/list, assign/track deliveries, mark delivered, reject with proof, and verify returned warehouse state or permanent consumption.',
		)
	}
	if (bullet.h2 === 'Driver App') {
		actions.push(
			'Login as driver only, go online/offline, send location, open assigned delivery, navigate/contact customer, verify the customer secret code/QR, reject with and without proof, and try unrelated delivery access.',
		)
	}
	if (bullet.h2 === 'AI Agents') {
		actions.push(
			'Ask allowed and forbidden prompts, request writes, request cross-scope data, inspect responses for refusal/scoping, and verify any audit record required by the agent boundary.',
		)
	}

	return dedupe(actions)
}

function edgeCasesFor(bullet) {
	const lower = `${bullet.area} ${bullet.text}`.toLowerCase()
	const cases = [
		'Empty input, invalid input, duplicated click, back/forward navigation, hard refresh, slow loading, and closed/reopened modal/drawer.',
		'Console errors, page errors, failed network requests, 4xx/5xx responses, and stale cached data after reload.',
	]
	if (
		hasAny(lower, ['cannot', 'must not', 'only', 'never', 'role', 'access'])
	) {
		cases.push(
			'Attempt the same action as every wrong role and through direct API/RPC/database client calls; confirm server-side denial.',
		)
	}
	if (
		hasAny(lower, [
			'transaction',
			'same order',
			'reserve',
			'assign',
			'concurrent',
		])
	) {
		cases.push(
			'Run concurrent attempts for the same row/resource and verify one winner, no double assignment/reservation, and correct loser error.',
		)
	}
	if (hasAny(lower, ['proof', 'reject', 'rejected'])) {
		cases.push(
			'Try rejection without proof, with incomplete proof, with valid proof, and after reload; verify proof is persisted and required.',
		)
	}
	if (hasAny(lower, ['provider', 'whatsapp', 'email', 'notification'])) {
		cases.push(
			'Run with local provider config absent; verify the database record persists and no UI claims external delivery unless configured.',
		)
	}
	if (
		hasAny(lower, ['arabic', 'english', 'bilingual', 'product names', 'units'])
	) {
		cases.push(
			'Switch EN/AR before and after the action; verify source data, not hardcoded UI text, drives displayed names/categories/specs/units.',
		)
	}
	return dedupe(cases)
}

function backendProofFor(bullet) {
	const lower = `${bullet.area} ${bullet.text}`.toLowerCase()
	const proof = [
		'Query Supabase after the UI action for the exact row/state/history/audit record; verify the row owner and timestamps.',
		'Run the relevant smoke or targeted test again after any fix; do not mark complete from typecheck alone.',
	]
	if (hasAny(lower, ['rls', 'role', 'cannot', 'must not', 'only', 'access'])) {
		proof.push(
			'Use anon/customer/internal/driver service clients as appropriate to prove RLS and server functions enforce the boundary.',
		)
	}
	if (hasAny(lower, ['activity', 'history', 'audit', 'event', 'who changed'])) {
		proof.push(
			'Verify append-only activity/audit entries include actor, entity, action, timestamp, and details/proof context.',
		)
	}
	if (hasAny(lower, ['performance', 'search', 'summary', 'views', 'map'])) {
		proof.push(
			'Check indexes/query plan or response timing for the loaded dataset and ensure no obviously unbounded client-side full-table path.',
		)
	}
	if (hasAny(lower, ['export', 'secret', 'sensitive', 'salary'])) {
		proof.push(
			'Inspect exported/read payloads for secret and sensitive-field redaction or intentional CEO-only exposure.',
		)
	}
	return dedupe(proof)
}

function hasAny(value, needles) {
	return needles.some((needle) => value.includes(needle))
}

function dedupe(values) {
	return [...new Set(values)]
}

function render(checklistRows) {
	const sections = groupByArea(checklistRows)
	const lines = [
		'# Flow.md Human Acceptance Tasklist',
		'',
		'Source of truth: `Flow.md`.',
		'',
		'This checklist is regenerated from every bullet requirement in `Flow.md`. Every status is intentionally `[ ]` until the final fresh browser/API/DB/security run proves that row in this run.',
		'',
		'Status legend: `[ ]` not tested in the final pass, `[x]` passed in the final live human/browser/API/DB test, `[!]` failed and needs a root fix plus retest, `[~]` external provider/config-limited with local persistence and fail-closed proof.',
		'',
		'## Non-Negotiable Test Rules',
		'',
		'- Never mark an item `[x]` from code inspection, old smoke output, typecheck, build, or assumptions.',
		'- Every completed item must have fresh evidence from this final acceptance run: live browser behavior where a user can do it, plus API/DB/RLS/advisor/stress proof where the requirement is backend/security/performance.',
		'- For every row, test the happy path and dumb-user branches: empty input, invalid input, fake credentials, duplicate action, unauthorized role, direct API/RPC bypass, refresh/reload, console errors, failed network requests, and persistence after navigation.',
		'- If a problem is found, record it as `[!]`, fix the root cause, run the same scenario again, and only then update the status.',
		'- If an external provider is required, prove local persistence and fail-closed behavior; leave it `[~]` with the provider/config blocker instead of pretending it passed.',
		'- Each browser-tested item must answer: what did I see, what happened when I clicked/typed, was the console clean, did the backend record the correct state, and what happened when I tried the wrong thing?',
		'- Do not stop the final run until the entire `Flow.md` tasklist is complete and the repo plus all active apps are production-ready, except for a true data-safety, external-provider/config, or explicit user-interruption blocker recorded honestly.',
		'',
		'## Coverage Gate',
		'',
		`- Total Flow.md bullet requirements: ${checklistRows.length}.`,
		'- Required before final signoff: zero `[ ]` rows and zero `[!]` rows; only true external-provider rows may remain `[~]`.',
		'- `node scripts/flow-human-tasklist.mjs --check` must confirm every `Flow.md` bullet line appears exactly once before the final test begins and after it ends.',
		'',
	]

	for (const [area, areaRows] of sections) {
		lines.push(`## ${area}`)
		lines.push('')
		lines.push(
			'| Status | Flow line | Persona | Requirement | Test method | Required interactions | Edge/stress branches | Backend proof | Final evidence / notes |',
		)
		lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
		for (const row of areaRows) {
			lines.push(
				`| [ ] | Flow.md:${row.line} | ${escapeTable(row.persona)} | ${escapeTable(row.text)} | ${escapeTable(row.method)} | ${escapeList(row.interactions)} | ${escapeList(row.edgeCases)} | ${escapeList(row.backendProof)} | Pending final fresh test. |`,
			)
		}
		lines.push('')
	}

	return `${lines.join('\n')}\n`
}

function groupByArea(checklistRows) {
	const grouped = new Map()
	for (const row of checklistRows) {
		const area = row.area || 'General'
		const list = grouped.get(area) ?? []
		list.push(row)
		grouped.set(area, list)
	}
	return grouped
}

function escapeList(items) {
	return escapeTable(items.map((item) => `- ${item}`).join('<br>'))
}

function escapeTable(value) {
	return String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>')
}
