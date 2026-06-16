import AuditLogService from '#services/audit_log_service'
import OrganizationMemberService from '#services/organization_member_service'
import OrganizationPolicy from '#policies/organization_policy'
import type { AuditLogFilters } from '#shared/types/audit_log'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class AuditLogsController {
  constructor(
    private auditLogService: AuditLogService,
    private memberService: OrganizationMemberService
  ) {}

  async index({ inertia, auth, bouncer, request, response }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')

    if (!this.auditLogService.canAccessAuditLog(user.organization)) {
      return response.redirect('/settings/billing')
    }

    await bouncer.with(OrganizationPolicy).authorize('viewAuditLog')

    const qs = request.qs()
    const filters: AuditLogFilters = {
      userId: qs.userId ? Number(qs.userId) : undefined,
      action: qs.action ?? undefined,
      from: qs.from ?? undefined,
      to: qs.to ?? undefined,
      page: qs.page ? Number(qs.page) : 1,
    }

    const [auditLog, members] = await Promise.all([
      this.auditLogService.list(user.organizationId!, filters),
      this.memberService.listMembers(user.organizationId!),
    ])

    return inertia.render('settings/audit_log', {
      auditLog,
      filters,
      members: members.map((m) => ({
        id: m.userId,
        fullName: m.fullName,
        email: m.email,
      })),
    })
  }
}
