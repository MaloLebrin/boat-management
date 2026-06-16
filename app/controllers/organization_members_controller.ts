import AuditLogService from '#services/audit_log_service'
import OrganizationMemberService from '#services/organization_member_service'
import OrganizationPolicy from '#policies/organization_policy'
import {
  AlreadyMemberError,
  LastAdminError,
  MemberNotFoundError,
  UserNotFoundError,
} from '#exceptions/organization_errors'
import { QuotaExceededError } from '#exceptions/quota_errors'
import QuotaService from '#services/quota_service'
import { inviteMemberValidator, updateMemberRoleValidator } from '#validators/organization_member'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class OrganizationMembersController {
  constructor(
    private memberService: OrganizationMemberService,
    private quotaService: QuotaService,
    private auditLogService: AuditLogService
  ) {}

  async index({ inertia, auth, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(OrganizationPolicy).authorize('viewMembers')

    const members = await this.memberService.listMembers(user.organizationId!)
    const canManageMembers = await bouncer.with(OrganizationPolicy).allows('manageMembers')

    return inertia.render('organization/members', { members, canManageMembers })
  }

  async store({ request, response, auth, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(OrganizationPolicy).authorize('manageMembers')
    await user.load('organization')

    try {
      await this.quotaService.assertCanAddMember(user.organization)
      const payload = await request.validateUsing(inviteMemberValidator)
      await this.memberService.addMember(user.organizationId!, payload.email, payload.role)
      await this.auditLogService.log({
        organizationId: user.organizationId!,
        userId: user.id,
        action: 'member.add',
        metadata: { email: payload.email, role: payload.role },
      })
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.membersExceeded'))
        return response.redirect().back()
      }
      if (error instanceof UserNotFoundError) {
        session.flash('error', 'member_user_not_found')
        return response.redirect().back()
      }
      if (error instanceof AlreadyMemberError) {
        session.flash('error', 'member_already_member')
        return response.redirect().back()
      }
      throw error
    }

    return response.redirect().back()
  }

  async update({ request, params, response, auth, bouncer, session }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(OrganizationPolicy).authorize('manageMembers')

    try {
      const payload = await request.validateUsing(updateMemberRoleValidator)
      await this.memberService.updateRole(Number(params.id), user.organizationId!, payload.role)
      await this.auditLogService.log({
        organizationId: user.organizationId!,
        userId: user.id,
        action: 'member.update_role',
        entityType: 'membership',
        entityId: Number(params.id),
        metadata: { role: payload.role },
      })
    } catch (error) {
      if (error instanceof MemberNotFoundError) return response.redirect().back()
      if (error instanceof LastAdminError) {
        session.flash('error', 'member_last_admin')
        return response.redirect().back()
      }
      throw error
    }

    return response.redirect().back()
  }

  async destroy({ params, response, auth, bouncer, session }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(OrganizationPolicy).authorize('manageMembers')

    try {
      await this.memberService.removeMember(Number(params.id), user.organizationId!)
      await this.auditLogService.log({
        organizationId: user.organizationId!,
        userId: user.id,
        action: 'member.remove',
        entityType: 'membership',
        entityId: Number(params.id),
      })
    } catch (error) {
      if (error instanceof MemberNotFoundError) return response.redirect().back()
      if (error instanceof LastAdminError) {
        session.flash('error', 'member_last_admin')
        return response.redirect().back()
      }
      throw error
    }

    return response.redirect().back()
  }
}
