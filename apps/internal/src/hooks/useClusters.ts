/**
 * Supercluster integration for vehicle pin clustering.
 * Memoizes GeoJSON point creation, uses ref for Supercluster instance.
 */

import { useMemo, useRef } from 'react'
import type { ClusterFeature, PointFeature } from 'supercluster'
import Supercluster from 'supercluster'
import type { GPSPosition } from '../types/dispatch'

export interface VehiclePointProperties {
	driverId: string
	status: string
	speed: number
	heading: number
}

export type VehicleCluster =
	| ClusterFeature<Supercluster.AnyProps>
	| PointFeature<VehiclePointProperties>

export function useClusters(
	vehicles: GPSPosition[],
	zoom: number,
	bounds: [number, number, number, number],
): VehicleCluster[] {
	const indexRef = useRef<Supercluster<VehiclePointProperties> | null>(null)

	const points: Array<PointFeature<VehiclePointProperties>> = useMemo(
		() =>
			vehicles.map((v) => ({
				type: 'Feature' as const,
				properties: {
					driverId: v.driverId,
					status: v.status,
					speed: v.speed,
					heading: v.heading,
				},
				geometry: {
					type: 'Point' as const,
					coordinates: [v.lng, v.lat],
				},
			})),
		[vehicles],
	)

	if (!indexRef.current) {
		indexRef.current = new Supercluster<VehiclePointProperties>({
			radius: 60,
			maxZoom: 16,
		})
	}

	indexRef.current.load(points)

	return indexRef.current.getClusters(bounds, Math.floor(zoom))
}
