import { injectManifest } from 'workbox-build'

async function buildSW() {
  // Step 1: Compile sw.ts to JS via Bun
  const result = await Bun.build({
    entrypoints: ['src/sw.ts'],
    outdir: '.tmp',
    target: 'browser',
    minify: true,
  })

  if (!result.success) {
    console.error('Failed to compile service worker:')
    for (const log of result.logs) {
      console.error(log)
    }
    process.exit(1)
  }

  // Step 2: Inject precache manifest into compiled SW
  const { count, size } = await injectManifest({
    swSrc: '.tmp/sw.js',
    swDest: 'dist/client/sw.js',
    globDirectory: 'dist/client',
    globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  })

  console.log(`Generated SW: ${count} files, ${(size / 1024).toFixed(1)}KB`)
}

buildSW().catch((err) => {
  console.error('Service worker build failed:', err)
  process.exit(1)
})
