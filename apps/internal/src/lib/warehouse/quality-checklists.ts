import type { MaterialCategory, QualityChecklistItem } from '../../types/warehouse'

/** Material-specific quality checklist definitions per CONTEXT.md section 4.3 */
const CHECKLISTS: Record<MaterialCategory, Array<{ label: string; required: boolean }>> = {
  cement: [
    { label: 'Bags intact (no hardness/lumps)', required: true },
    { label: 'Manufacture date visible', required: true },
    { label: 'Pallet condition acceptable', required: true },
    { label: 'Shrink wrap intact', required: false },
    { label: 'Type matches PO', required: true },
  ],
  steel_rebar: [
    { label: 'Rust level acceptable', required: true },
    { label: 'Sizes/lengths match PO', required: true },
    { label: 'Grade stamps visible', required: true },
    { label: 'Bundle tags intact', required: true },
    { label: 'Mill Test Certificate received', required: true },
    { label: 'No excessive bending', required: true },
  ],
  lumber: [
    { label: 'Grade stamps present', required: true },
    { label: 'No excessive warping/splitting', required: true },
    { label: 'Moisture content acceptable', required: true },
    { label: 'Tally count by dimension', required: true },
    { label: 'Species matches PO', required: true },
  ],
  aggregates: [
    { label: 'Weigh ticket matches', required: true },
    { label: 'Visual quality (no contamination)', required: true },
    { label: 'Material type matches PO', required: true },
  ],
  pipe: [
    { label: 'No cracks/dents', required: true },
    { label: 'Diameter/schedule matches PO', required: true },
    { label: 'Lengths correct', required: true },
    { label: 'Ends undamaged', required: true },
  ],
  roofing: [
    { label: 'No heat/sun damage', required: true },
    { label: 'Packaging intact', required: true },
    { label: 'Lot numbers match PO', required: false },
  ],
  insulation: [
    { label: 'No water damage', required: true },
    { label: 'Packaging intact', required: true },
    { label: 'R-value/thickness matches PO', required: true },
    { label: 'Not compressed beyond recovery', required: true },
  ],
}

/**
 * Get the quality checklist items for a specific material category.
 * Returns a fresh array of QualityChecklistItem with unique IDs.
 */
export function getQualityChecklist(category: MaterialCategory): QualityChecklistItem[] {
  const items = CHECKLISTS[category]
  if (!items) return []

  return items.map((item, index) => ({
    id: `${category}-${index}`,
    label: item.label,
    checked: false,
    required: item.required,
  }))
}
