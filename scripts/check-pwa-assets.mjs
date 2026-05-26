import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

const APPS = [
	{
		key: 'website',
		name: 'HyperQuote',
		shortName: 'HyperQuote',
		backgroundColor: '#2563EB',
		themeColor: '#2563EB',
		manifestFiles: ['site.webmanifest'],
		serviceWorkerFile: 'service-worker.js',
		serviceWorkerUrl: '/service-worker.js',
		headFile: 'src/routes/__root.tsx',
		registrationFile: 'src/lib/pwa.ts',
	},
	{
		key: 'portal',
		name: 'Lyon',
		shortName: 'Lyon',
		backgroundColor: '#2563EB',
		themeColor: '#2563EB',
		manifestFiles: ['site.webmanifest', 'manifest.json'],
		serviceWorkerFile: 'sw.js',
		serviceWorkerUrl: '/sw.js',
		headFile: 'src/routes/__root.tsx',
		registrationFile: 'src/lib/pwa.ts',
	},
	{
		key: 'internal',
		name: 'Base',
		shortName: 'Base',
		backgroundColor: '#ffffff',
		themeColor: '#ffffff',
		manifestFiles: ['site.webmanifest'],
		serviceWorkerFile: 'service-worker.js',
		serviceWorkerUrl: '/service-worker.js',
		headFile: 'src/routes/__root.tsx',
		registrationFile: 'src/lib/pwa.ts',
	},
	{
		key: 'driver',
		name: 'Drive',
		shortName: 'Drive',
		backgroundColor: '#ffffff',
		themeColor: '#ffffff',
		manifestFiles: ['site.webmanifest'],
		serviceWorkerFile: 'service-worker.js',
		serviceWorkerUrl: '/service-worker.js',
		headFile: 'index.html',
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
	['icon-192.png', 192],
	['icon-512.png', 512],
	['pwa/icon-192.png', 192],
	['pwa/icon-512.png', 512],
	['pwa/maskable-192.png', 192],
	['pwa/maskable-512.png', 512],
	['apple-touch-icon.png', 180],
	['apple-touch-icon-152x152.png', 152],
	['apple-touch-icon-167x167.png', 167],
	['apple-touch-icon-180x180.png', 180],
	['mstile-150x150.png', 150],
	['favicon-96x96.png', 96],
]

const failures = []

for (const app of APPS) {
	const publicDir = join(ROOT, 'apps', app.key, 'public')

	for (const manifestFile of app.manifestFiles) {
		const manifestPath = join(publicDir, manifestFile)
		const manifest = readJson(manifestPath)
		validateManifest(app, manifest, manifestFile)
	}

	for (const [assetPath, size] of PNG_ASSETS) {
		validatePngDimensions(join(publicDir, assetPath), size, app.key)
	}

	validateServiceWorker(app, publicDir)
	validateHead(app)
	validateRegistration(app)
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

	assert(
		cacheVersion.length > 0 &&
			[...cacheVersion].every((digit) => digit >= '0' && digit <= '9'),
		`${label}: cache name must be versioned`,
	)
	assert(serviceWorker.includes("'/',"), `${label}: must cache the app shell`)
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
	assert(
		serviceWorker.includes("'/pwa/icon-512.png'"),
		`${label}: must cache the high resolution icon`,
	)
	assert(
		serviceWorker.includes("'/pwa/maskable-512.png'"),
		`${label}: must cache the high resolution maskable icon`,
	)
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
}

function validateHead(app) {
	const head = readText(join(ROOT, 'apps', app.key, app.headFile))
	const label = `${app.key}/${app.headFile}`

	assert(
		head.includes('/site.webmanifest'),
		`${label}: must link the web app manifest`,
	)
	assert(
		head.includes('apple-mobile-web-app-capable'),
		`${label}: must include iOS standalone metadata`,
	)
	assert(
		head.includes('apple-mobile-web-app-title') && head.includes(app.shortName),
		`${label}: must include the app install title`,
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

function validatePngDimensions(path, expectedSize, appKey) {
	try {
		const bytes = readFileSync(path)
		const isPng =
			bytes.length >= 24 &&
			bytes[0] === 0x89 &&
			bytes.toString('ascii', 1, 4) === 'PNG'
		assert(isPng, `${appKey}: ${path} must be a PNG`)
		if (!isPng) return

		const width = bytes.readUInt32BE(16)
		const height = bytes.readUInt32BE(20)
		assert(
			width === expectedSize && height === expectedSize,
			`${appKey}: ${path} must be ${expectedSize}x${expectedSize}, got ${width}x${height}`,
		)
	} catch (error) {
		fail(`${appKey}: ${path}: ${error.message}`)
	}
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
