import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
	appId: 'net.hyperquote.driver',
	appName: 'HyperStreets',
	webDir: 'dist',
	zoomEnabled: false,
	backgroundColor: '#ffffff',
	ios: {
		contentInset: 'automatic',
	},
	android: {
		allowMixedContent: false,
	},
	plugins: {
		Geolocation: {
			permissions: ['location'],
		},
	},
}

export default config
