export type OrderReportStageId =
	| 'submitted'
	| 'sales'
	| 'finance'
	| 'inventory'
	| 'warehouse'
	| 'dispatch'
	| 'delivery'
	| 'stopped'

export type OrderReportStepStatus =
	| 'completed'
	| 'current'
	| 'pending'
	| 'stopped'
	| 'special'

export type OrderReportActorKind = 'customer' | 'employee' | 'driver' | 'system'

export interface OrderReportActor {
	id: string | null
	kind: OrderReportActorKind
	name: string
}

export interface OrderReportFact {
	label: string
	value: string
}

export interface OrderReportSpecialCase {
	kind:
		| 'dispatch_return'
		| 'final_payment'
		| 'warehouse_rejection'
		| 'cancellation'
		| 'rejection'
	label: string
}

export interface OrderReportStep {
	id: string
	stage: OrderReportStageId
	status: OrderReportStepStatus
	title: string
	summary: string
	timestamp: string | null
	actor: OrderReportActor | null
	advisor: OrderReportActor | null
	facts: OrderReportFact[]
	lines: string[]
	specialCase: OrderReportSpecialCase | null
}

export interface OrderReportSummary {
	headline: string
	status: 'active' | 'completed' | 'stopped'
	currentStage: OrderReportStageId
	lastAction: string | null
	processedBy: string | null
	reachedStage: string
	specialCaseCount: number
}

export interface LifecycleOrderReport {
	exportFileName: string
	generatedAt: string
	summary: OrderReportSummary
	steps: OrderReportStep[]
	pending: OrderReportStageId[]
}
