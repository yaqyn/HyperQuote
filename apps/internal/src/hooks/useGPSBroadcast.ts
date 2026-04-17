/**
 * Supabase Realtime Broadcast hook for fleet GPS tracking.
 * Subscribes to 'fleet-gps' channel, receives 'gps-ping' events.
 * Throttles React state updates to max 1/second via requestAnimationFrame.
 * For dev without live GPS: accepts initial positions and simulates movement.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GPSPosition } from '../types/dispatch'

/** Cairo-area random jitter for dev simulation */
function jitter(value: number, range = 0.002): number {
	return value + (Math.random() - 0.5) * range
}

export function useGPSBroadcast(
	supabase: SupabaseClient | null,
	initialPositions?: GPSPosition[],
): Map<string, GPSPosition> {
	const [positions, setPositions] = useState<Map<string, GPSPosition>>(() => {
		const map = new Map<string, GPSPosition>()
		if (initialPositions) {
			for (const pos of initialPositions) {
				map.set(pos.driverId, pos)
			}
		}
		return map
	})

	// Buffer for throttling: accumulate pings, flush to React state at most 1/sec
	const bufferRef = useRef<Map<string, GPSPosition>>(new Map())
	const rafRef = useRef<number | null>(null)
	const lastFlushRef = useRef<number>(0)

	const flushBuffer = useCallback(() => {
		rafRef.current = null
		if (bufferRef.current.size === 0) return

		const updates = new Map(bufferRef.current)
		bufferRef.current.clear()
		lastFlushRef.current = performance.now()

		setPositions((prev) => {
			const next = new Map(prev)
			for (const [id, pos] of updates) {
				next.set(id, pos)
			}
			return next
		})
	}, [])

	const scheduleFlush = useCallback(() => {
		if (rafRef.current !== null) return
		const elapsed = performance.now() - lastFlushRef.current
		if (elapsed >= 1000) {
			// Enough time passed, flush immediately on next frame
			rafRef.current = requestAnimationFrame(flushBuffer)
		} else {
			// Schedule flush after remaining time
			const delay = 1000 - elapsed
			const timeoutId = setTimeout(() => {
				rafRef.current = requestAnimationFrame(flushBuffer)
			}, delay)
			// Store timeout as raf to prevent double-scheduling
			rafRef.current = timeoutId as unknown as number
		}
	}, [flushBuffer])

	// Supabase Realtime Broadcast subscription
	useEffect(() => {
		if (!supabase) return

		const channel = supabase
			.channel('fleet-gps')
			.on('broadcast', { event: 'gps-ping' }, ({ payload }) => {
				const pos: GPSPosition = {
					driverId: payload.driverId,
					lat: payload.lat,
					lng: payload.lng,
					speed: payload.speed,
					heading: payload.heading,
					timestamp: payload.timestamp,
					status: payload.status,
				}
				bufferRef.current.set(pos.driverId, pos)
				scheduleFlush()
			})
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current)
				rafRef.current = null
			}
		}
	}, [supabase, scheduleFlush])

	// Dev simulation: random jitter every 3 seconds when no live GPS
	useEffect(() => {
		if (supabase) return // Real broadcast active, skip simulation
		if (!initialPositions || initialPositions.length === 0) return

		const interval = setInterval(() => {
			setPositions((prev) => {
				const next = new Map(prev)
				for (const [id, pos] of next) {
					next.set(id, {
						...pos,
						lat: jitter(pos.lat),
						lng: jitter(pos.lng),
						speed: Math.max(0, pos.speed + (Math.random() - 0.5) * 10),
						heading: (pos.heading + (Math.random() - 0.5) * 30 + 360) % 360,
						timestamp: new Date().toISOString(),
					})
				}
				return next
			})
		}, 3000)

		return () => clearInterval(interval)
	}, [supabase, initialPositions])

	return positions
}
