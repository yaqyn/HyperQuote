/**
 * Team management server functions backed by Supabase.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { TeamMember } from '../../types/settings'
import { getAuthenticatedPortalCustomer } from './_supabase'

type DbTeamRole = 'owner' | 'admin' | 'member'

function toUiRole(role: string): TeamMember['role'] {
	if (role === 'owner' || role === 'admin') return 'approver'
	return 'buyer'
}

function toDbRole(role: TeamMember['role']): DbTeamRole {
	return role === 'buyer' ? 'member' : 'admin'
}

export const getTeamMembers = createServerFn().handler(
	async (): Promise<TeamMember[]> => {
		const { customerId, session, supabase } =
			await getAuthenticatedPortalCustomer()
		const { data, error } = await supabase
			.from('team_members')
			.select('id, user_id, role, created_at')
			.eq('customer_id', customerId)
			.order('created_at', { ascending: true })

		if (error) throw new Error(error.message)

		return (data ?? []).map((member) => {
			const isCurrentUser = member.user_id === session.user.id
			const email = isCurrentUser
				? (session.user.email ?? member.user_id)
				: member.user_id
			return {
				id: member.id,
				name: email,
				email,
				role: toUiRole(member.role),
				isOwner: member.role === 'owner',
				joinedAt: member.created_at,
			}
		})
	},
)

export const inviteTeamMember = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			email: z.string().email(),
			role: z.enum(['buyer', 'approver', 'site_manager']),
		}),
	)
	.handler(async ({ data: input }): Promise<{ inviteId: string }> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const { data, error } = await supabase
			.from('team_invites')
			.insert({
				customer_id: customerId,
				email: input.email,
				role: toDbRole(input.role),
			})
			.select('id')
			.single()

		if (error || !data) {
			throw new Error(error?.message ?? 'Failed to create invite')
		}
		return { inviteId: data.id }
	})

export const removeTeamMember = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ memberId: z.string() }))
	.handler(async ({ data: input }): Promise<{ success: boolean }> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const { error } = await supabase
			.from('team_members')
			.delete()
			.eq('id', input.memberId)
			.eq('customer_id', customerId)

		if (error) throw new Error(error.message)
		return { success: true }
	})

export const changeTeamMemberRole = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			memberId: z.string(),
			newRole: z.enum(['buyer', 'approver', 'site_manager']),
		}),
	)
	.handler(async ({ data: input }): Promise<{ success: boolean }> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const { error } = await supabase
			.from('team_members')
			.update({ role: toDbRole(input.newRole) })
			.eq('id', input.memberId)
			.eq('customer_id', customerId)

		if (error) throw new Error(error.message)
		return { success: true }
	})

export const transferOwnership = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			memberId: z.string(),
			otpCode: z.string().min(6).max(6),
		}),
	)
	.handler(async ({ data: input }): Promise<{ success: boolean }> => {
		const { supabase } = await getAuthenticatedPortalCustomer()
		const { error } = await supabase.rpc('transfer_team_ownership', {
			p_member_id: input.memberId,
		})

		if (error) throw new Error(error.message)
		return { success: true }
	})
