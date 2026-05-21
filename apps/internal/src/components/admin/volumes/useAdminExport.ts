import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import {
	type AdminExportScope,
	adminExportData,
} from '../../../lib/server/admin'

export function useAdminExport(scope: AdminExportScope) {
	const [summary, setSummary] = useState<string | null>(null)
	const exportMutation = useMutation({
		mutationFn: (reason: string) =>
			adminExportData({ data: { reason, scope } }),
		onSuccess: (result) => {
			setSummary(`${result.rows.length.toLocaleString()} rows exported`)
		},
	})

	function requestExport() {
		const reason =
			typeof window === 'undefined'
				? null
				: window.prompt('Reason for exporting this data')
		if (!reason || reason.trim().length < 8) return
		exportMutation.mutate(reason.trim())
	}

	return {
		exportStatus: summary,
		isExporting: exportMutation.isPending,
		requestExport,
	}
}
