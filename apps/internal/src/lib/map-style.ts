import { createMapLibreStyle } from '@hyperquote/ui/maps/maplibre-style'
import type { StyleSpecification } from 'maplibre-gl'

export const MAP_STYLE: string | StyleSpecification = createMapLibreStyle(
	import.meta.env.VITE_MAPTILER_KEY,
)
