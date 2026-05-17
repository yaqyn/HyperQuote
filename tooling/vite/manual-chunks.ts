const NODE_MODULES = '/node_modules/'

function isPackage(id: string, packageName: string) {
	return id.includes(`${NODE_MODULES}${packageName}/`)
}

function isScopedPackage(id: string, scope: string) {
	return id.includes(`${NODE_MODULES}${scope}/`)
}

export function hyperquoteManualChunks(id: string) {
	const normalized = id.replaceAll('\\', '/')
	if (!normalized.includes(NODE_MODULES)) return undefined

	if (
		isPackage(normalized, 'maplibre-gl') ||
		isPackage(normalized, 'react-map-gl')
	) {
		return 'vendor-maps'
	}

	if (
		isPackage(normalized, 'react') ||
		isPackage(normalized, 'react-dom') ||
		isPackage(normalized, 'scheduler') ||
		isPackage(normalized, 'use-sync-external-store')
	) {
		return 'vendor-react'
	}

	if (isScopedPackage(normalized, '@tanstack')) {
		return 'vendor-tanstack'
	}

	if (normalized.includes(`${NODE_MODULES}@ai-sdk/`)) {
		return 'vendor-ai'
	}

	if (
		isPackage(normalized, 'motion') ||
		isPackage(normalized, 'motion-dom') ||
		isPackage(normalized, 'framer-motion')
	) {
		return 'vendor-motion'
	}

	if (isPackage(normalized, 'react-aria-components')) {
		return 'vendor-aria-components'
	}

	if (isScopedPackage(normalized, '@react-aria')) {
		return 'vendor-react-aria'
	}

	if (
		isScopedPackage(normalized, '@react-stately') ||
		isScopedPackage(normalized, '@react-types') ||
		isScopedPackage(normalized, '@internationalized')
	) {
		return 'vendor-aria-core'
	}

	if (
		isPackage(normalized, 'i18next') ||
		isPackage(normalized, 'react-i18next')
	) {
		return 'vendor-i18n'
	}

	if (
		isPackage(normalized, 'zod') ||
		isPackage(normalized, 'standard-schema')
	) {
		return 'vendor-validation'
	}

	if (isScopedPackage(normalized, '@supabase')) {
		return 'vendor-supabase'
	}

	return undefined
}
