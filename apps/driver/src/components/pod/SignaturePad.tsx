import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import {
	Button as AriaButton,
	Input,
	Label,
	ListBox,
	ListBoxItem,
	Popover,
	Select,
	SelectValue,
	TextField,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import SignatureCanvas from 'react-signature-canvas'

export interface SignatureData {
	signatureDataUrl: string
	signerName: string
	signerRole: string
}

export interface SignaturePadRef {
	getSignatureData: () => SignatureData | null
	isEmpty: () => boolean
}

interface SignaturePadProps {
	signerName: string
	onSignerNameChange: (name: string) => void
	signerRole: string
	onSignerRoleChange: (role: string) => void
	customRole: string
	onCustomRoleChange: (role: string) => void
	onSignatureChange?: (isEmpty: boolean) => void
}

const ROLES = [
	'foreman',
	'pm',
	'siteEngineer',
	'owner',
	'superintendent',
	'other',
] as const

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
	function SignaturePad(
		{
			signerName,
			onSignerNameChange,
			signerRole,
			onSignerRoleChange,
			customRole,
			onCustomRoleChange,
			onSignatureChange,
		},
		ref,
	) {
		const { t } = useTranslation('driver')
		const canvasRef = useRef<SignatureCanvas | null>(null)

		useImperativeHandle(ref, () => ({
			getSignatureData: () => {
				if (!canvasRef.current || canvasRef.current.isEmpty()) return null
				const role = signerRole === 'other' ? customRole : signerRole
				return {
					signatureDataUrl: canvasRef.current.toDataURL('image/png'),
					signerName,
					signerRole: role,
				}
			},
			isEmpty: () => canvasRef.current?.isEmpty() ?? true,
		}))

		const handleClear = useCallback(() => {
			canvasRef.current?.clear()
			onSignatureChange?.(true)
		}, [onSignatureChange])

		const handleEnd = useCallback(() => {
			const empty = canvasRef.current?.isEmpty() ?? true
			onSignatureChange?.(!empty)
		}, [onSignatureChange])

		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="text-base font-semibold text-[var(--text-primary)]">
						{t('pod.signature')}
					</h3>
					<AriaButton
						onPress={handleClear}
						className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-blue)] hover:bg-blue-50"
					>
						{t('pod.clear')}
					</AriaButton>
				</div>

				{/* Signature canvas */}
				<div className="rounded-xl border-2 border-[var(--border-color)] bg-white overflow-hidden">
					<SignatureCanvas
						ref={(el: SignatureCanvas | null) => {
							canvasRef.current = el
						}}
						penColor="#0F172A"
						minWidth={2}
						maxWidth={4}
						canvasProps={{
							className: 'w-full',
							style: {
								height: '40vh',
								minHeight: '200px',
								width: '100%',
								touchAction: 'none',
							},
						}}
						onEnd={handleEnd}
					/>
				</div>

				{/* Signer name */}
				<TextField value={signerName} onChange={onSignerNameChange} isRequired>
					<Label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
						{t('pod.signerName')}
					</Label>
					<Input
						className="w-full rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-base text-[var(--text-primary)] outline-none focus:border-[var(--color-blue)] min-h-[var(--touch-min)]"
						placeholder={t('pod.signerName')}
					/>
				</TextField>

				{/* Signer role */}
				<div className="space-y-1">
					<span className="block text-sm font-medium text-[var(--text-primary)]">
						{t('pod.signerRole')}
					</span>
					<Select
						selectedKey={signerRole}
						onSelectionChange={(key) => onSignerRoleChange(key as string)}
					>
						<AriaButton className="flex w-full items-center justify-between rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-base text-[var(--text-primary)] outline-none focus:border-[var(--color-blue)] min-h-[var(--touch-min)]">
							<SelectValue />
							<span aria-hidden="true">&#9662;</span>
						</AriaButton>
						<Popover className="w-[var(--trigger-width)] rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg overflow-hidden">
							<ListBox className="outline-none">
								{ROLES.map((role) => (
									<ListBoxItem
										key={role}
										id={role}
										className="cursor-pointer px-4 py-3 text-base text-[var(--text-primary)] hover:bg-blue-50 focus:bg-blue-50 outline-none min-h-[var(--touch-min)] flex items-center"
									>
										{t(`pod.${role}`)}
									</ListBoxItem>
								))}
							</ListBox>
						</Popover>
					</Select>
				</div>

				{/* Custom role input */}
				{signerRole === 'other' && (
					<TextField
						value={customRole}
						onChange={onCustomRoleChange}
						isRequired
					>
						<Label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
							{t('pod.signerRole')}
						</Label>
						<Input
							className="w-full rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-base text-[var(--text-primary)] outline-none focus:border-[var(--color-blue)] min-h-[var(--touch-min)]"
							placeholder={t('pod.other')}
						/>
					</TextField>
				)}
			</div>
		)
	},
)
