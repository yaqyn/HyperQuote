import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

let runtime: Promise<typeof import('maplibre-gl')> | undefined

export function loadMapLibre() {
	// MapLibre 6's ESM worker must pass through Vite's worker bundler so its
	// shared imports remain available in both dev and production assets.
	runtime ??= import('maplibre-gl').then((mapLib) => {
		mapLib.setWorkerUrl(workerUrl)
		return mapLib
	})
	return runtime
}
