import { useState } from 'react'
import { DisputeList } from './DisputeList'
import { DisputeDetail } from './DisputeDetail'

/**
 * Container for dispute views.
 * Default: DisputeList. Click dispute -> DisputeDetail.
 */
export function DisputeWorkflow() {
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null)

  if (selectedDisputeId) {
    return (
      <div className="p-6">
        <DisputeDetail
          disputeId={selectedDisputeId}
          onBack={() => setSelectedDisputeId(null)}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <DisputeList
        onSelectDispute={setSelectedDisputeId}
        onCreateDispute={() => {
          // In production: opens creation form modal
        }}
      />
    </div>
  )
}
