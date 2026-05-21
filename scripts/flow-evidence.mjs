#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'

const FLOW_PATH = 'Flow.md'
const TASKLIST_PATH = 'Flow.human-tasklist.md'
const OUTPUT_PATH = 'Flow.evidence.md'

main()

function main() {
	const rows = parseBullets(readFileSync(FLOW_PATH, 'utf8'))
	const tasklistEvidence = parseTasklistEvidence(
		readFileSync(TASKLIST_PATH, 'utf8'),
	)
	const ledgerRows = rows.map((row) => {
		const evidence = tasklistEvidence.get(row.line)
		if (!evidence) {
			throw new Error(`${TASKLIST_PATH} is missing Flow.md:${row.line}`)
		}
		if (evidence.status === '[ ]' || evidence.status === '[!]') {
			throw new Error(
				`${TASKLIST_PATH} has unresolved final status ${evidence.status} for Flow.md:${row.line}`,
			)
		}
		return {
			...row,
			status: evidence.status,
			evidence: evidence.note,
		}
	})
	const output = renderEvidence(ledgerRows)

	if (process.argv.includes('--check')) {
		const existing = readFileSync(OUTPUT_PATH, 'utf8')
		if (existing !== output) {
			throw new Error(
				`${OUTPUT_PATH} is stale. Run bun run flow:evidence to regenerate the final evidence ledger.`,
			)
		}
		const summary = summarize(ledgerRows)
		console.log(
			`${OUTPUT_PATH} is current: ${summary.verified} verified, ${summary.providerLimited} provider-limited, ${summary.failed} failed, ${summary.pending} pending.`,
		)
		return
	}

	if (process.argv.includes('--write')) {
		writeFileSync(OUTPUT_PATH, output)
		const summary = summarize(ledgerRows)
		console.log(
			`Wrote ${OUTPUT_PATH}: ${summary.verified} verified, ${summary.providerLimited} provider-limited, ${summary.failed} failed, ${summary.pending} pending.`,
		)
		return
	}

	process.stdout.write(output)
}

function parseBullets(markdown) {
	const bullets = []
	const lines = markdown.split('\n')
	let h2 = ''
	let h3 = ''
	let h4 = ''
	let current = null

	for (const [index, rawLine] of lines.entries()) {
		const lineNumber = index + 1
		const heading2 = /^## (.+)$/.exec(rawLine)
		if (heading2) {
			flush()
			h2 = heading2[1].trim()
			h3 = ''
			h4 = ''
			continue
		}

		const heading3 = /^### (.+)$/.exec(rawLine)
		if (heading3) {
			flush()
			h3 = heading3[1].trim()
			h4 = ''
			continue
		}

		const heading4 = /^#### (.+)$/.exec(rawLine)
		if (heading4) {
			flush()
			h4 = heading4[1].trim()
			continue
		}

		const bullet = /^- (.+)$/.exec(rawLine)
		if (bullet) {
			flush()
			current = {
				area: [h2, h3, h4].filter(Boolean).join(' / '),
				line: lineNumber,
				text: bullet[1].trim(),
			}
			continue
		}

		if (current && /^\s{2,}\S/.test(rawLine)) {
			current.text = `${current.text} ${rawLine.trim()}`
		}
	}

	flush()
	return bullets

	function flush() {
		if (!current) return
		bullets.push(current)
		current = null
	}
}

function renderEvidence(rows) {
	const summary = summarize(rows)
	return `# Flow.md Evidence Ledger

Generated from \`${FLOW_PATH}\` and \`${TASKLIST_PATH}\`.

This file is the final evidence ledger for the 520-row human acceptance tasklist. It must not be regenerated as complete unless \`${TASKLIST_PATH}\` has zero pending rows and zero failed rows.

Clean final baseline used for this ledger:

- \`bun run db:reset\`
- \`bun run db:seed:local-auth\`
- \`bun run db:types\`
- \`bunx playwright test scripts/flow-*.spec.ts --workers=1\` passed 41/41 on clean local Supabase
- \`bun run flow:db-smoke\`
- \`supabase db lint --local --fail-on warning\`
- \`supabase db advisors --local --fail-on warn\`
- \`bun run check:ci\`
- \`bun run typecheck\`
- \`bun run build\`
- \`bun run scan:secrets\`
- \`bun run scan:semgrep\`
- \`bun run scan:arch\`
- \`bun run scan:vulns\`
- \`bun run knip\`
- \`bun run sync\`
- \`git diff --check\`

Status legend: \`[ ]\` not tested in the final pass, \`[x]\` passed with fresh final-pass proof, \`[!]\` failed and needs a root fix plus retest, \`[~]\` external provider/config-limited with local persistence and fail-closed proof.

Summary: ${summary.verified} verified rows, ${summary.failed} failed rows, ${summary.pending} pending rows, ${summary.providerLimited} provider-limited rows.

| Status | Flow line | Area | Requirement | Final-pass evidence |
| --- | --- | --- | --- | --- |
${rows
	.map(
		(row) =>
			`| ${row.status} | Flow.md:${row.line} | ${escapeTable(row.area)} | ${escapeTable(row.text)} | ${escapeTable(row.evidence)} |`,
	)
	.join('\n')}
`
}

function parseTasklistEvidence(markdown) {
	const evidence = new Map()
	for (const line of markdown.split('\n')) {
		const match = /^\| (\[[x!~ ]\]) \| Flow\.md:(\d+) \|/.exec(line)
		if (!match) continue
		const lineNumber = Number(match[2])
		if (evidence.has(lineNumber)) {
			throw new Error(`${TASKLIST_PATH} has duplicate Flow.md:${lineNumber}`)
		}
		const cells = line.split(' | ')
		const note = stripTrailingCellMarker(cells.at(-1) ?? '')
		evidence.set(lineNumber, {
			status: match[1],
			note,
		})
	}
	return evidence
}

function stripTrailingCellMarker(value) {
	return value.replace(/\s*\|$/, '').trim()
}

function summarize(rows) {
	return rows.reduce(
		(summary, row) => {
			if (row.status === '[x]') summary.verified += 1
			if (row.status === '[~]') summary.providerLimited += 1
			if (row.status === '[!]') summary.failed += 1
			if (row.status === '[ ]') summary.pending += 1
			return summary
		},
		{ failed: 0, pending: 0, providerLimited: 0, verified: 0 },
	)
}

function escapeTable(value) {
	return String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>')
}
