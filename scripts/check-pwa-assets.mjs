import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { inflateSync } from 'node:zlib'

const ROOT = process.cwd()
const BRAND_BLUE = '#2563EB'
const PWA_CHROME = '#0A0A0A'
const WHITE = '#ffffff'
const ICON_MARK_DOMINANT_MIN_RATIO = 0.36
const ICON_MARK_DOMINANT_MAX_RATIO = 0.44
const ICON_MARK_SECONDARY_MIN_RATIO = 0.14

const APPS = [
	{
		key: 'website',
		name: 'HyperQuote',
		shortName: 'HyperQuote',
		backgroundColor: BRAND_BLUE,
		foregroundColor: WHITE,
		themeColor: PWA_CHROME,
		manifestFiles: ['site.webmanifest'],
		serviceWorkerFile: 'service-worker.js',
		serviceWorkerUrl: '/service-worker.js',
		headFiles: ['src/routes/__root.tsx'],
		registrationFile: 'src/lib/pwa.ts',
	},
	{
		key: 'portal',
		name: 'Lyon',
		shortName: 'Lyon',
		backgroundColor: BRAND_BLUE,
		foregroundColor: WHITE,
		themeColor: PWA_CHROME,
		manifestFiles: ['site.webmanifest', 'manifest.json'],
		serviceWorkerFile: 'sw.js',
		serviceWorkerUrl: '/sw.js',
		headFiles: [
			'src/routes/__root.tsx',
			'src/lib/page-meta.ts',
			'src/lib/theme.ts',
		],
		installSurfaceFile: 'src/components/sidebar/ChatSidebar.tsx',
		registrationFile: 'src/lib/pwa.ts',
	},
	{
		key: 'internal',
		name: 'Base',
		shortName: 'Base',
		backgroundColor: WHITE,
		foregroundColor: BRAND_BLUE,
		themeColor: PWA_CHROME,
		manifestFiles: ['site.webmanifest'],
		serviceWorkerFile: 'service-worker.js',
		serviceWorkerUrl: '/service-worker.js',
		headFiles: ['src/routes/__root.tsx', 'src/lib/page-meta.ts'],
		installSurfaceFile: 'src/components/shell/AppActionsMenu.tsx',
		registrationFile: 'src/lib/pwa.ts',
	},
	{
		key: 'driver',
		name: 'Drive',
		shortName: 'Drive',
		backgroundColor: WHITE,
		foregroundColor: BRAND_BLUE,
		themeColor: PWA_CHROME,
		manifestFiles: ['site.webmanifest'],
		serviceWorkerFile: 'service-worker.js',
		serviceWorkerUrl: '/service-worker.js',
		headFiles: ['index.html'],
		installSurfaceFile: 'src/components/DriverOptionsMenu.tsx',
		registrationFile: 'src/lib/pwa.ts',
	},
]

const MANIFEST_ICONS = [
	{ purpose: 'any', size: 192, src: '/pwa/icon-192.png' },
	{ purpose: 'any', size: 512, src: '/pwa/icon-512.png' },
	{ purpose: 'maskable', size: 192, src: '/pwa/maskable-192.png' },
	{ purpose: 'maskable', size: 512, src: '/pwa/maskable-512.png' },
]

const PNG_ASSETS = [
	{ path: 'icon-192.png', size: 192, visual: 'any' },
	{ path: 'icon-512.png', size: 512, visual: 'any' },
	{ path: 'pwa/icon-192.png', size: 192, visual: 'any' },
	{ path: 'pwa/icon-512.png', size: 512, visual: 'any' },
	{ path: 'pwa/maskable-192.png', size: 192, visual: 'maskable' },
	{ path: 'pwa/maskable-512.png', size: 512, visual: 'maskable' },
	{ path: 'apple-touch-icon.png', size: 180, visual: 'any' },
	{ path: 'apple-touch-icon-152x152.png', size: 152, visual: 'any' },
	{ path: 'apple-touch-icon-167x167.png', size: 167, visual: 'any' },
	{ path: 'apple-touch-icon-180x180.png', size: 180, visual: 'any' },
	{ path: 'mstile-150x150.png', size: 150, visual: 'any' },
	{ path: 'favicon-96x96.png', size: 96, visual: 'any' },
]

const failures = []

for (const app of APPS) {
	const publicDir = join(ROOT, 'apps', app.key, 'public')

	for (const manifestFile of app.manifestFiles) {
		const manifestPath = join(publicDir, manifestFile)
		const manifest = readJson(manifestPath)
		validateManifest(app, manifest, manifestFile)
	}

	for (const asset of PNG_ASSETS) {
		validatePngAsset(join(publicDir, asset.path), asset, app)
	}

	validateIconAliases(app, publicDir)
	validateServiceWorker(app, publicDir)
	validateBrowserConfig(app, publicDir)
	validateHead(app)
	validateRegistration(app)
	validateInstallSurface(app)
}

if (failures.length > 0) {
	console.error('PWA check failed:')
	for (const failure of failures) {
		console.error(`- ${failure}`)
	}
	process.exit(1)
}

console.log(`PWA checks passed for ${APPS.length} apps.`)

function validateManifest(app, manifest, manifestFile) {
	const label = `${app.key}/${manifestFile}`

	assert(manifest.id === '/', `${label}: id must stay scoped to /`)
	assert(manifest.name === app.name, `${label}: name must be ${app.name}`)
	assert(
		manifest.short_name === app.shortName,
		`${label}: short_name must be ${app.shortName}`,
	)
	assert(manifest.start_url === '/', `${label}: start_url must be /`)
	assert(manifest.scope === '/', `${label}: scope must be /`)
	assert(
		manifest.display === 'standalone',
		`${label}: display must be standalone`,
	)
	assert(
		Array.isArray(manifest.display_override) &&
			manifest.display_override[0] === 'standalone' &&
			manifest.display_override.includes('minimal-ui'),
		`${label}: display_override must prefer standalone`,
	)
	assert(
		manifest.background_color === app.backgroundColor,
		`${label}: background_color must be ${app.backgroundColor}`,
	)
	assert(
		manifest.theme_color === app.themeColor,
		`${label}: theme_color must be ${app.themeColor}`,
	)
	assert(
		manifest.prefer_related_applications === false,
		`${label}: related native app handoff must stay disabled`,
	)

	for (const expectedIcon of MANIFEST_ICONS) {
		const icon = manifest.icons?.find(
			(item) =>
				item?.src === expectedIcon.src &&
				item?.sizes === `${expectedIcon.size}x${expectedIcon.size}`,
		)
		assert(icon, `${label}: missing ${expectedIcon.src}`)
		if (!icon) continue
		assert(icon.type === 'image/png', `${label}: ${icon.src} must be PNG`)
		assert(
			hasPurpose(icon.purpose, expectedIcon.purpose),
			`${label}: ${icon.src} must include ${expectedIcon.purpose}`,
		)
	}
}

function validateServiceWorker(app, publicDir) {
	const serviceWorker = readText(join(publicDir, app.serviceWorkerFile))
	const label = `${app.key}/${app.serviceWorkerFile}`
	const cacheVersion = readCacheVersion(serviceWorker, app.key)

	try {
		new Function(serviceWorker)
	} catch (error) {
		fail(`${label}: must be valid JavaScript (${error.message})`)
	}

	assert(
		cacheVersion.length > 0 &&
			[...cacheVersion].every((digit) => digit >= '0' && digit <= '9'),
		`${label}: cache name must be versioned`,
	)
	assert(serviceWorker.includes("'/',"), `${label}: must cache the app shell`)
	assert(
		serviceWorker.includes("'/browserconfig.xml'"),
		`${label}: must cache browserconfig.xml`,
	)
	assert(
		serviceWorker.includes("'/site.webmanifest'"),
		`${label}: must cache site.webmanifest`,
	)
	if (app.key === 'portal') {
		assert(
			serviceWorker.includes("'/manifest.json'"),
			`${label}: must cache the legacy manifest alias`,
		)
	}
	for (const asset of PNG_ASSETS) {
		assert(
			serviceWorker.includes(`'/${asset.path}'`),
			`${label}: must cache /${asset.path}`,
		)
	}
	assert(
		serviceWorker.includes('self.skipWaiting()'),
		`${label}: must activate updated manifests promptly`,
	)
	assert(
		serviceWorker.includes('self.clients.claim()'),
		`${label}: must claim clients after activation`,
	)
	assert(
		serviceWorker.includes("self.addEventListener('fetch'"),
		`${label}: must handle fetch events for installability`,
	)
	assert(
		serviceWorker.includes('networkFirstNavigation'),
		`${label}: installed app launches need a navigation fallback`,
	)
	assert(
		serviceWorker.includes("request.destination === 'image'"),
		`${label}: must cache fetched image assets for installed mode`,
	)
}

function validateBrowserConfig(app, publicDir) {
	const browserConfig = readText(join(publicDir, 'browserconfig.xml'))
	const label = `${app.key}/browserconfig.xml`

	assert(
		browserConfig.includes('<square150x150logo src="/mstile-150x150.png" />'),
		`${label}: must point to the generated Windows tile icon`,
	)
	assert(
		browserConfig.includes(`<TileColor>${app.backgroundColor}</TileColor>`),
		`${label}: tile color must match ${app.backgroundColor}`,
	)
}

function validateHead(app) {
	const head = app.headFiles
		.map((file) => readText(join(ROOT, 'apps', app.key, file)))
		.join('\n')
	const label = `${app.key}/head`

	assert(
		head.includes('/site.webmanifest'),
		`${label}: must link the web app manifest`,
	)
	assert(
		head.includes('viewport-fit=cover'),
		`${label}: viewport must cover mobile display cutouts`,
	)
	assert(
		head.includes('mobile-web-app-capable'),
		`${label}: must include mobile standalone metadata`,
	)
	assert(
		head.includes('apple-mobile-web-app-capable'),
		`${label}: must include iOS standalone metadata`,
	)
	assert(
		head.includes('apple-mobile-web-app-title') && head.includes(app.shortName),
		`${label}: must include the app install title`,
	)
	assert(
		head.includes('apple-mobile-web-app-status-bar-style'),
		`${label}: must declare iOS status bar style`,
	)
	assert(
		head.includes('black'),
		`${label}: iOS standalone chrome must stay dark`,
	)
	assert(
		head.includes('application-name') && head.includes(app.shortName),
		`${label}: must include the installed app name`,
	)
	assert(
		head.includes('theme-color'),
		`${label}: must include theme-color metadata`,
	)
	assert(
		head.includes(app.themeColor),
		`${label}: mobile browser chrome must use ${app.themeColor}`,
	)
	assert(
		head.includes('msapplication-TileColor') &&
			head.includes(app.backgroundColor),
		`${label}: must include the matching Windows tile color`,
	)
	assert(
		head.includes('/apple-touch-icon-180x180.png') &&
			head.includes('/mstile-150x150.png'),
		`${label}: must link platform icon assets`,
	)
}

function validateRegistration(app) {
	const registration = readText(
		join(ROOT, 'apps', app.key, app.registrationFile),
	)
	const label = `${app.key}/${app.registrationFile}`

	assert(
		registration.includes(`.register('${app.serviceWorkerUrl}'`),
		`${label}: must register ${app.serviceWorkerUrl}`,
	)
	assert(
		registration.includes("scope: '/'"),
		`${label}: service worker scope must cover the full app`,
	)
	assert(
		registration.includes('registration.update()'),
		`${label}: should request service worker updates after load`,
	)
}

function validateInstallSurface(app) {
	if (!app.installSurfaceFile) return

	const source = readText(join(ROOT, 'apps', app.key, app.installSurfaceFile))
	const label = `${app.key}/${app.installSurfaceFile}`

	assert(
		source.includes('usePwaInstallPrompt'),
		`${label}: must use the shared install prompt hook`,
	)
	assert(
		source.includes('detectPwaInstallGuideKind'),
		`${label}: must include platform-specific fallback guidance`,
	)
	assert(
		source.includes('install.install()'),
		`${label}: must call the browser install prompt when available`,
	)
	assert(
		source.includes(app.shortName),
		`${label}: install UI must use the simple PWA app name`,
	)
}

function validateIconAliases(app, publicDir) {
	const aliases = [
		['icon-192.png', 'pwa/icon-192.png'],
		['icon-512.png', 'pwa/icon-512.png'],
		['apple-touch-icon.png', 'apple-touch-icon-180x180.png'],
	]

	for (const [first, second] of aliases) {
		const firstBytes = readBytes(join(publicDir, first))
		const secondBytes = readBytes(join(publicDir, second))
		assert(
			firstBytes.length > 0 &&
				secondBytes.length > 0 &&
				firstBytes.equals(secondBytes),
			`${app.key}: ${first} and ${second} must stay identical`,
		)
	}
}

function readCacheVersion(serviceWorker, appKey) {
	const prefix = `const CACHE_NAME = 'hyperquote-${appKey}-v`
	const start = serviceWorker.indexOf(prefix)
	if (start === -1) return ''

	const versionStart = start + prefix.length
	const versionEnd = serviceWorker.indexOf("'", versionStart)
	if (versionEnd === -1) return ''

	return serviceWorker.slice(versionStart, versionEnd)
}

function readJson(path) {
	return JSON.parse(readText(path))
}

function readText(path) {
	try {
		return readFileSync(path, 'utf8')
	} catch (error) {
		fail(`${path}: ${error.message}`)
		return ''
	}
}

function readBytes(path) {
	try {
		return readFileSync(path)
	} catch (error) {
		fail(`${path}: ${error.message}`)
		return Buffer.alloc(0)
	}
}

function validatePngAsset(path, asset, app) {
	const png = decodePng(path, app.key)
	if (!png) return

	assert(
		png.width === asset.size && png.height === asset.size,
		`${app.key}: ${path} must be ${asset.size}x${asset.size}, got ${png.width}x${png.height}`,
	)
	validateIconVisual(path, png, app)
}

function validateIconVisual(path, png, app) {
	const background = hexToRgb(app.backgroundColor)
	const foreground = hexToRgb(app.foregroundColor)
	const stats = measureIconVisual(png, background, foreground)
	const dominantRatio = Math.max(stats.widthRatio, stats.heightRatio)
	const secondaryRatio = Math.min(stats.widthRatio, stats.heightRatio)
	const minForegroundPixels = Math.max(
		20,
		Math.floor(png.width * png.height * 0.0025),
	)

	assert(
		stats.alphaMin === 255 && stats.alphaMax === 255,
		`${app.key}: ${path} must be fully opaque for solid launcher rendering`,
	)
	assert(
		stats.edgeMismatches === 0,
		`${app.key}: ${path} must keep a solid ${app.backgroundColor} background to every edge`,
	)
	assert(stats.nonBackgroundPixels > 0, `${app.key}: ${path} has no icon mark`)
	assert(
		stats.foregroundPixels >= minForegroundPixels,
		`${app.key}: ${path} must contain the expected ${app.foregroundColor} icon mark`,
	)
	assert(
		dominantRatio >= ICON_MARK_DOMINANT_MIN_RATIO &&
			dominantRatio <= ICON_MARK_DOMINANT_MAX_RATIO,
		`${app.key}: ${path} icon mark must fill about 40% of the launcher frame, got ${dominantRatio.toFixed(2)}`,
	)
	assert(
		secondaryRatio >= ICON_MARK_SECONDARY_MIN_RATIO,
		`${app.key}: ${path} icon mark secondary axis is too small, got ${secondaryRatio.toFixed(2)}`,
	)
	assert(
		Math.abs(stats.centerX - 0.5) <= 0.04 &&
			Math.abs(stats.centerY - 0.5) <= 0.04,
		`${app.key}: ${path} icon mark must stay centered`,
	)
}

function decodePng(path, appKey) {
	const bytes = readBytes(path)
	const signature = Buffer.from([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
	])
	if (!bytes.subarray(0, signature.length).equals(signature)) {
		fail(`${appKey}: ${path} must be a PNG`)
		return null
	}

	let offset = signature.length
	let width = 0
	let height = 0
	let bitDepth = 0
	let colorType = 0
	const idatChunks = []

	while (offset + 12 <= bytes.length) {
		const length = bytes.readUInt32BE(offset)
		const type = bytes.toString('ascii', offset + 4, offset + 8)
		const dataStart = offset + 8
		const dataEnd = dataStart + length
		const nextOffset = dataEnd + 4

		if (nextOffset > bytes.length) {
			fail(`${appKey}: ${path} has an invalid PNG chunk`)
			return null
		}

		if (type === 'IHDR') {
			width = bytes.readUInt32BE(dataStart)
			height = bytes.readUInt32BE(dataStart + 4)
			bitDepth = bytes[dataStart + 8]
			colorType = bytes[dataStart + 9]
			const compression = bytes[dataStart + 10]
			const filter = bytes[dataStart + 11]
			const interlace = bytes[dataStart + 12]
			assert(
				compression === 0,
				`${appKey}: ${path} uses unsupported PNG compression`,
			)
			assert(filter === 0, `${appKey}: ${path} uses unsupported PNG filtering`)
			assert(interlace === 0, `${appKey}: ${path} must be non-interlaced`)
		} else if (type === 'IDAT') {
			idatChunks.push(bytes.subarray(dataStart, dataEnd))
		} else if (type === 'IEND') {
			break
		}

		offset = nextOffset
	}

	assert(width > 0 && height > 0, `${appKey}: ${path} is missing IHDR`)
	assert(idatChunks.length > 0, `${appKey}: ${path} is missing IDAT data`)
	assert(
		bitDepth === 8 || bitDepth === 16,
		`${appKey}: ${path} must use 8-bit or 16-bit channels`,
	)
	assert(
		colorType === 2 || colorType === 6,
		`${appKey}: ${path} must use RGB or RGBA pixels`,
	)

	if (
		width === 0 ||
		height === 0 ||
		idatChunks.length === 0 ||
		(bitDepth !== 8 && bitDepth !== 16) ||
		(colorType !== 2 && colorType !== 6)
	) {
		return null
	}

	const bytesPerSample = bitDepth / 8
	const channels = colorType === 6 ? 4 : 3
	const filterBytesPerPixel = channels * bytesPerSample
	const rowBytes = width * filterBytesPerPixel
	const inflated = inflateSync(Buffer.concat(idatChunks))
	const expectedBytes = (rowBytes + 1) * height

	if (inflated.length < expectedBytes) {
		fail(`${appKey}: ${path} has truncated PNG pixel data`)
		return null
	}

	const pixels = new Uint8Array(width * height * 4)
	let rawOffset = 0
	let previousRow = Buffer.alloc(rowBytes)

	for (let y = 0; y < height; y += 1) {
		const filterType = inflated[rawOffset]
		rawOffset += 1
		const row = Buffer.from(inflated.subarray(rawOffset, rawOffset + rowBytes))
		rawOffset += rowBytes
		unfilterPngRow(row, previousRow, filterType, filterBytesPerPixel)

		for (let x = 0; x < width; x += 1) {
			const sourceOffset = x * filterBytesPerPixel
			const targetOffset = (y * width + x) * 4
			pixels[targetOffset] = readPngChannel(row, sourceOffset, bitDepth)
			pixels[targetOffset + 1] = readPngChannel(
				row,
				sourceOffset + bytesPerSample,
				bitDepth,
			)
			pixels[targetOffset + 2] = readPngChannel(
				row,
				sourceOffset + bytesPerSample * 2,
				bitDepth,
			)
			pixels[targetOffset + 3] =
				colorType === 6
					? readPngChannel(row, sourceOffset + bytesPerSample * 3, bitDepth)
					: 255
		}

		previousRow = row
	}

	return { height, pixels, width }
}

function unfilterPngRow(row, previousRow, filterType, bytesPerPixel) {
	if (filterType === 0) return

	for (let index = 0; index < row.length; index += 1) {
		const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0
		const up = previousRow[index] ?? 0
		const upLeft =
			index >= bytesPerPixel ? (previousRow[index - bytesPerPixel] ?? 0) : 0

		if (filterType === 1) {
			row[index] = (row[index] + left) & 0xff
		} else if (filterType === 2) {
			row[index] = (row[index] + up) & 0xff
		} else if (filterType === 3) {
			row[index] = (row[index] + Math.floor((left + up) / 2)) & 0xff
		} else if (filterType === 4) {
			row[index] = (row[index] + paethPredictor(left, up, upLeft)) & 0xff
		} else {
			throw new Error(`Unsupported PNG filter ${filterType}`)
		}
	}
}

function readPngChannel(row, offset, bitDepth) {
	if (bitDepth === 16) return Math.round(row.readUInt16BE(offset) / 257)
	return row[offset]
}

function paethPredictor(left, up, upLeft) {
	const predictor = left + up - upLeft
	const leftDistance = Math.abs(predictor - left)
	const upDistance = Math.abs(predictor - up)
	const upLeftDistance = Math.abs(predictor - upLeft)

	if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left
	if (upDistance <= upLeftDistance) return up
	return upLeft
}

function measureIconVisual(png, background, foreground) {
	let alphaMin = 255
	let alphaMax = 0
	let edgeMismatches = 0
	let foregroundPixels = 0
	let nonBackgroundPixels = 0
	let minX = png.width
	let minY = png.height
	let maxX = -1
	let maxY = -1

	for (let y = 0; y < png.height; y += 1) {
		for (let x = 0; x < png.width; x += 1) {
			const offset = (y * png.width + x) * 4
			const pixel = {
				r: png.pixels[offset],
				g: png.pixels[offset + 1],
				b: png.pixels[offset + 2],
			}
			const alpha = png.pixels[offset + 3]
			alphaMin = Math.min(alphaMin, alpha)
			alphaMax = Math.max(alphaMax, alpha)

			const isBackground = rgbClose(pixel, background, 4)
			if (!isBackground) {
				nonBackgroundPixels += 1
				minX = Math.min(minX, x)
				minY = Math.min(minY, y)
				maxX = Math.max(maxX, x)
				maxY = Math.max(maxY, y)
			}
			if (rgbClose(pixel, foreground, 8)) foregroundPixels += 1
			if (
				(x === 0 || y === 0 || x === png.width - 1 || y === png.height - 1) &&
				!isBackground
			) {
				edgeMismatches += 1
			}
		}
	}

	if (nonBackgroundPixels === 0) {
		return {
			alphaMax,
			alphaMin,
			centerX: 0,
			centerY: 0,
			edgeMismatches,
			foregroundPixels,
			heightRatio: 0,
			nonBackgroundPixels,
			widthRatio: 0,
		}
	}

	const contentWidth = maxX - minX + 1
	const contentHeight = maxY - minY + 1
	return {
		alphaMax,
		alphaMin,
		centerX: (minX + contentWidth / 2) / png.width,
		centerY: (minY + contentHeight / 2) / png.height,
		edgeMismatches,
		foregroundPixels,
		heightRatio: contentHeight / png.height,
		nonBackgroundPixels,
		widthRatio: contentWidth / png.width,
	}
}

function hexToRgb(value) {
	const hex = value.startsWith('#') ? value.slice(1) : value
	return {
		r: Number.parseInt(hex.slice(0, 2), 16),
		g: Number.parseInt(hex.slice(2, 4), 16),
		b: Number.parseInt(hex.slice(4, 6), 16),
	}
}

function rgbClose(actual, expected, tolerance) {
	return (
		Math.abs(actual.r - expected.r) <= tolerance &&
		Math.abs(actual.g - expected.g) <= tolerance &&
		Math.abs(actual.b - expected.b) <= tolerance
	)
}

function hasPurpose(value, expected) {
	return typeof value === 'string' && value.split(/\s+/u).includes(expected)
}

function assert(condition, message) {
	if (!condition) fail(message)
}

function fail(message) {
	failures.push(message)
}
