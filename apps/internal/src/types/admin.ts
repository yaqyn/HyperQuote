// Admin domain — the internal registry
//
// The admin module is an ops-facing console for direct maintenance of
// records that other internal panels rely on: customers, products,
// employees, drivers, trucks, and suppliers.
//
// Volumes are the organizing metaphor: each volume is one table in
// the registry. The UI surfaces them as roman-numeraled entries in a
// bound catalog rather than as a hamburger menu of modules.

import type { ParseKeys } from 'i18next'

export type AdminKey = ParseKeys<'admin'>

export type VolumeId =
	| 'customers'
	| 'products'
	| 'categories'
	| 'employees'
	| 'drivers'
	| 'trucks'
	| 'suppliers'
	| 'pricingRules'

export interface VolumeDefinition {
	id: VolumeId
	/** Roman numeral used in the masthead and rail. Immutable order. */
	roman: string
	/** i18n key under the admin namespace, e.g. `volumes.customers.title` */
	labelKey: AdminKey
	/** i18n key for the short descriptor under the volume title */
	subtitleKey: AdminKey
	/** True if the underlying table is compiled-in (no mutations). */
	readOnly: boolean
}

/**
 * Ordered list of volumes in the registry. Roman numerals are assigned
 * here — the order is the identity. Adding a volume appends; reordering
 * changes every volume's numeral, so don't reorder without intent.
 */
export const VOLUMES: VolumeDefinition[] = [
	{
		id: 'customers',
		roman: 'I',
		labelKey: 'volumes.customers.title',
		subtitleKey: 'volumes.customers.subtitle',
		readOnly: false,
	},
	{
		id: 'products',
		roman: 'II',
		labelKey: 'volumes.products.title',
		subtitleKey: 'volumes.products.subtitle',
		readOnly: false,
	},
	{
		id: 'categories',
		roman: 'III',
		labelKey: 'volumes.categories.title',
		subtitleKey: 'volumes.categories.subtitle',
		readOnly: false,
	},
	{
		id: 'employees',
		roman: 'IV',
		labelKey: 'volumes.employees.title',
		subtitleKey: 'volumes.employees.subtitle',
		readOnly: false,
	},
	{
		id: 'drivers',
		roman: 'V',
		labelKey: 'volumes.drivers.title',
		subtitleKey: 'volumes.drivers.subtitle',
		readOnly: false,
	},
	{
		id: 'trucks',
		roman: 'VI',
		labelKey: 'volumes.trucks.title',
		subtitleKey: 'volumes.trucks.subtitle',
		readOnly: false,
	},
	{
		id: 'suppliers',
		roman: 'VII',
		labelKey: 'volumes.suppliers.title',
		subtitleKey: 'volumes.suppliers.subtitle',
		readOnly: false,
	},
	{
		id: 'pricingRules',
		roman: 'VIII',
		labelKey: 'volumes.pricingRules.title',
		subtitleKey: 'volumes.pricingRules.subtitle',
		readOnly: false,
	},
]

/**
 * Looks up a volume by its id. Throws if missing — the catalog above is
 * hand-authored and every `VolumeId` is guaranteed to resolve at runtime,
 * so a miss means the VolumeId type and the array have drifted.
 */
export function getVolume(id: VolumeId): VolumeDefinition {
	const match = VOLUMES.find((v) => v.id === id)
	if (!match) throw new Error(`Unknown admin volume: ${id}`)
	return match
}

/**
 * Editor state. `null` = closed, everything else = open in that mode.
 * The editor is a single SlidePanel that the volumes share; mode drives
 * which affordances render (view is read-only, edit patches an existing
 * record, create starts blank).
 */
export type EditorMode = 'view' | 'edit' | 'create'
