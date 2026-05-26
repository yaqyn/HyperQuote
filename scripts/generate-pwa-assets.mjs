import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const ROOT = process.cwd()
const BRAND_BLUE = '#2563EB'
const WHITE = '#FFFFFF'
const ICON_MARK_MAX_RATIO = 0.4

const APPS = [
	{
		key: 'website',
		source: 'essential/brand/Icons/Website/Website.svg',
		backgroundColor: BRAND_BLUE,
		foregroundColor: WHITE,
	},
	{
		key: 'portal',
		source: 'essential/brand/Icons/Portal/Portal.svg',
		backgroundColor: BRAND_BLUE,
		foregroundColor: WHITE,
	},
	{
		key: 'internal',
		source: 'essential/brand/Icons/Internal/Internal.svg',
		backgroundColor: WHITE,
		foregroundColor: BRAND_BLUE,
	},
	{
		key: 'driver',
		source: 'essential/brand/Icons/Driver/Driver.svg',
		backgroundColor: WHITE,
		foregroundColor: BRAND_BLUE,
	},
]

const OUTPUT_GROUPS = [
	{
		size: 512,
		paths: ['icon-512.png', 'pwa/icon-512.png', 'pwa/maskable-512.png'],
	},
	{
		size: 192,
		paths: ['icon-192.png', 'pwa/icon-192.png', 'pwa/maskable-192.png'],
	},
	{
		size: 180,
		paths: ['apple-touch-icon.png', 'apple-touch-icon-180x180.png'],
	},
	{ size: 167, paths: ['apple-touch-icon-167x167.png'] },
	{ size: 152, paths: ['apple-touch-icon-152x152.png'] },
	{ size: 150, paths: ['mstile-150x150.png'] },
	{ size: 96, paths: ['favicon-96x96.png'] },
]

const tempDir = mkdtempSync(join(tmpdir(), 'hyperquote-pwa-'))

try {
	for (const app of APPS) {
		const publicDir = join(ROOT, 'apps', app.key, 'public')
		const sourcePath = join(ROOT, app.source)
		const sourceMask = join(tempDir, `${app.key}-source-mask.png`)

		runMagick([
			'-background',
			'none',
			sourcePath,
			'-alpha',
			'extract',
			sourceMask,
		])

		for (const group of OUTPUT_GROUPS) {
			const output = join(tempDir, `${app.key}-${group.size}.png`)
			renderPwaAsset({
				backgroundColor: app.backgroundColor,
				foregroundColor: app.foregroundColor,
				output,
				size: group.size,
				sourceMask,
			})

			for (const relativePath of group.paths) {
				const targetPath = join(publicDir, relativePath)
				mkdirSync(dirname(targetPath), { recursive: true })
				copyFileSync(output, targetPath)
			}
		}
	}
} finally {
	rmSync(tempDir, { force: true, recursive: true })
}

console.log(`Generated PWA icons for ${APPS.length} apps.`)

function renderPwaAsset({
	backgroundColor,
	foregroundColor,
	output,
	size,
	sourceMask,
}) {
	const markSize = Math.round(size * ICON_MARK_MAX_RATIO)
	const centeredMask = join(tempDir, `mask-${size}-${Math.random()}.png`)
	const foreground = join(tempDir, `fg-${size}-${Math.random()}.png`)

	runMagick([
		sourceMask,
		'-trim',
		'+repage',
		'-resize',
		`${markSize}x${markSize}`,
		'-background',
		'black',
		'-gravity',
		'center',
		'-extent',
		`${size}x${size}`,
		centeredMask,
	])

	runMagick([
		'-size',
		`${size}x${size}`,
		`xc:${foregroundColor}`,
		centeredMask,
		'-alpha',
		'off',
		'-compose',
		'CopyOpacity',
		'-composite',
		foreground,
	])

	runMagick([
		'-size',
		`${size}x${size}`,
		`xc:${backgroundColor}`,
		foreground,
		'-compose',
		'over',
		'-composite',
		'-strip',
		`PNG32:${output}`,
	])
}

function runMagick(args) {
	const result = spawnSync('magick', args, {
		cwd: ROOT,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})

	if (result.status === 0) return

	const detail = result.stderr.trim() || result.stdout.trim()
	throw new Error(
		`magick ${args.join(' ')} failed${detail ? `:\n${detail}` : ''}`,
	)
}
