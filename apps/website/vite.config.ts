import { hyperquoteManualChunks } from '../../tooling/vite/manual-chunks'
import { defineReactStartAppConfig } from '../../tooling/vite/react-start-app'

function websiteManualChunks(id: string) {
	const normalized = id.replaceAll('\\', '/')

	if (
		normalized.includes('/node_modules/@tanstack/ai/') ||
		normalized.includes('/node_modules/@tanstack/ai-react/')
	) {
		return undefined
	}

	return hyperquoteManualChunks(id)
}

export default defineReactStartAppConfig({
	assetsInclude: ['**/*.md'],
	manualChunks: websiteManualChunks,
	port: 3000,
	tanstackStartOptions: {
		prerender: {
			enabled: true,
			autoStaticPathsDiscovery: false,
			crawlLinks: false,
		},
		pages: [{ path: '/' }, { path: '/about' }],
	},
})
