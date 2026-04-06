/**
 * FEFO (First Expired, First Out) sorting and enforcement.
 * System-enforced: will NOT allow picking newer lot when older has sufficient quantity.
 */

/**
 * Sort items by expiry date ascending (First Expired First Out).
 * Items with null expiry are sorted last.
 */
export function sortByFEFO<T extends { expiryDate: string | null; lotNumber: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.expiryDate === null && b.expiryDate === null) return 0
    if (a.expiryDate === null) return 1
    if (b.expiryDate === null) return -1
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  })
}

interface FEFOLot {
  lotNumber: string
  expiryDate: string | null
  quantityAvailable: number
}

interface FEFOValidation {
  valid: boolean
  redirectTo?: string
  reason?: string
}

/**
 * Validate a pick against FEFO rules.
 * Returns invalid + redirect if an older lot has sufficient quantity.
 */
export function validateFEFOPick(
  selectedLot: string,
  availableLots: FEFOLot[],
  requiredQty: number,
): FEFOValidation {
  const sorted = sortByFEFO(availableLots)

  for (const lot of sorted) {
    if (lot.lotNumber === selectedLot) {
      // Reached the selected lot in FEFO order — it IS the oldest eligible lot
      return { valid: true }
    }

    // An older lot exists with sufficient quantity — redirect
    if (lot.quantityAvailable >= requiredQty) {
      return {
        valid: false,
        redirectTo: lot.lotNumber,
        reason: `Older lot ${lot.lotNumber} (expires ${lot.expiryDate ?? 'N/A'}) has sufficient quantity (${lot.quantityAvailable})`,
      }
    }
  }

  // Selected lot not found in available lots — still valid (edge case)
  return { valid: true }
}
