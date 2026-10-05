import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

// Render the existing brand assets into a reproducible, code-native cover.
const frames = await mkdtemp(join(tmpdir(), 'hyperquote-cover-'))
const logo = await readFile('essential/brand/Icons/Website/Website.svg', 'utf8')
const font = await readFile('essential/brand/fonts/inter/Inter-ExtraBold.woff2')
const browser = await chromium.launch({
	executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
})
try {
	const page = await browser.newPage({
		viewport: { width: 1200, height: 450 },
		deviceScaleFactor: 1,
	})
	await page.setContent(
		`<style>@font-face{font-family:Inter;src:url(data:font/woff2;base64,${font.toString('base64')});font-weight:800}body{margin:0}canvas{display:block}</style><canvas width="1200" height="450"></canvas>`,
	)
	await page.evaluate(async (logo) => {
		await document.fonts.load('800 64px Inter')
		const image = new Image()
		image.src = `data:image/svg+xml;base64,${btoa(logo)}`
		await image.decode()
		window.drawCover = (phase) => {
			const ctx = document.querySelector('canvas').getContext('2d')
			ctx.fillStyle = '#101010'
			ctx.fillRect(0, 0, 1200, 450)
			ctx.strokeStyle = '#232323'
			ctx.lineWidth = 1
			for (let x = 720; x < 1200; x += 40) {
				ctx.beginPath()
				ctx.moveTo(x, 0)
				ctx.lineTo(x, 450)
				ctx.stroke()
			}
			for (let y = 10; y < 450; y += 40) {
				ctx.beginPath()
				ctx.moveTo(720, y)
				ctx.lineTo(1200, y)
				ctx.stroke()
			}
			for (let row = 0; row < 7; row++)
				for (let col = 0; col < 9; col++) {
					const pulse =
						(Math.sin(phase * Math.PI * 2 - col * 0.5 - row * 0.35) + 1) / 2
					ctx.fillStyle = `rgba(37,99,235,${0.08 + pulse * 0.48})`
					ctx.fillRect(780 + col * 40, 90 + row * 40, 34, 34)
				}
			ctx.drawImage(image, 60, 47, 32, 32)
			ctx.fillStyle = '#ffffff'
			ctx.font = '800 27px Inter'
			ctx.fillText('HyperQuote', 106, 74)
			ctx.font = '13px monospace'
			ctx.fillStyle = '#9ca3af'
			ctx.fillText('BUILDING MATERIALS / EGYPT', 60, 139)
			ctx.font = '800 64px Inter'
			ctx.fillStyle = '#ffffff'
			ctx.fillText('Build the Future,', 56, 224)
			ctx.fillStyle = '#2563eb'
			ctx.fillText('Faster.', 56, 301)
			ctx.fillStyle = '#9ca3af'
			ctx.font = '14px monospace'
			ctx.fillText('ONE WORKFLOW. FOUR CONNECTED APPS.', 60, 385)
			ctx.fillStyle = '#2563eb'
			ctx.fillRect(60, 415, 1080, 2)
		}
	}, logo)
	for (let frame = 0; frame < 48; frame++) {
		await page.evaluate((phase) => window.drawCover(phase), frame / 48)
		await page.screenshot({
			path: join(frames, `${String(frame).padStart(3, '0')}.png`),
		})
	}
	const result = spawnSync(
		'ffmpeg',
		[
			'-y',
			'-loglevel',
			'error',
			'-framerate',
			'8',
			'-i',
			join(frames, '%03d.png'),
			'-filter_complex',
			'[0:v]split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none',
			'-loop',
			'0',
			'docs/readme/cover.gif',
		],
		{ stdio: 'inherit' },
	)
	if (result.status !== 0) throw new Error('Cover encoding failed')
} finally {
	await browser.close()
	await rm(frames, { recursive: true, force: true })
}
