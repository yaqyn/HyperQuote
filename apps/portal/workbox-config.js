/** @type {import('workbox-build').InjectManifestConfig} */
export default {
	swSrc: 'public/sw.js',
	swDest: 'dist/client/sw.js',
	globDirectory: 'dist/client',
	globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
}
