import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ApprovalDetail } from '../../../components/approval/ApprovalDetail'
import { getApprovalDetail } from '../../../lib/server/approval'

export const Route = createFileRoute('/_ceo/approval/$id')({
	loader: async ({ params }) => {
		const approval = await getApprovalDetail({
			data: { approvalId: params.id },
		})
		return { approval }
	},
	component: ApprovalDetailPage,
})

function ApprovalDetailPage() {
	const { approval } = Route.useLoaderData()
	const router = useRouter()

	function handleBack() {
		router.history.back()
	}

	return <ApprovalDetail approval={approval} onBack={handleBack} />
}
