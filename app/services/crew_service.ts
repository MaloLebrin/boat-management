import { CrewMemberNotFoundError, CrewCertificationNotFoundError } from '#exceptions/crew_errors'
import CrewCertification from '#models/crew_certification'
import CrewMember from '#models/crew_member'
import NavigationLog from '#models/navigation_log'
import type {
  CreateCrewMemberPayload,
  UpdateCrewMemberPayload,
  CreateCrewCertificationPayload,
  SyncNavigationLogCrewPayload,
  CrewMemberRow,
  CrewCertificationRow,
  NavigationLogCrewRow,
  CrewMemberOption,
} from '#shared/types/crew'
import type Organization from '#models/organization'
import { toDateTime } from '#shared/helpers/date'

export { CrewMemberNotFoundError, CrewCertificationNotFoundError }

export default class CrewService {
  async listForOrganization(organization: Organization): Promise<CrewMemberRow[]> {
    const members = await CrewMember.query()
      .where('organizationId', organization.id)
      .preload('certifications')
      .orderBy('last_name', 'asc')
      .orderBy('first_name', 'asc')

    return members.map((m) => this.#toRow(m))
  }

  async listOptionsForOrganization(organization: Organization): Promise<CrewMemberOption[]> {
    const members = await CrewMember.query()
      .where('organizationId', organization.id)
      .orderBy('last_name', 'asc')
      .orderBy('first_name', 'asc')
      .select('id', 'first_name', 'last_name')

    return members.map((m) => ({ id: m.id, fullName: m.fullName }))
  }

  async getForOrganizationOrFail(organization: Organization, id: number): Promise<CrewMember> {
    const member = await CrewMember.query()
      .where('id', id)
      .where('organizationId', organization.id)
      .preload('certifications')
      .first()

    if (!member) throw new CrewMemberNotFoundError()
    return member
  }

  async create(organization: Organization, payload: CreateCrewMemberPayload): Promise<CrewMember> {
    return await CrewMember.create({
      organizationId: organization.id,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      notes: payload.notes?.trim() || null,
    })
  }

  async update(member: CrewMember, payload: UpdateCrewMemberPayload): Promise<CrewMember> {
    member.firstName = payload.firstName.trim()
    member.lastName = payload.lastName.trim()
    member.email = payload.email?.trim() || null
    member.phone = payload.phone?.trim() || null
    member.notes = payload.notes?.trim() || null
    await member.save()
    return member
  }

  async delete(member: CrewMember): Promise<void> {
    await member.delete()
  }

  async addCertification(
    member: CrewMember,
    payload: CreateCrewCertificationPayload
  ): Promise<CrewCertification> {
    return await CrewCertification.create({
      crewMemberId: member.id,
      type: payload.type,
      referenceNumber: payload.referenceNumber?.trim() || null,
      expiresAt: payload.expiresAt ? toDateTime(payload.expiresAt) : null,
    })
  }

  async deleteCertification(member: CrewMember, certificationId: number): Promise<void> {
    const cert = await CrewCertification.query()
      .where('id', certificationId)
      .where('crewMemberId', member.id)
      .first()

    if (!cert) throw new CrewCertificationNotFoundError()
    await cert.delete()
  }

  async getCrewForNavigationLog(logId: number): Promise<NavigationLogCrewRow[]> {
    const log = await NavigationLog.query().where('id', logId).preload('crew').first()

    if (!log) return []

    return log.crew.map((m) => ({
      crewMemberId: m.id,
      fullName: m.fullName,
      role: m.$extras.pivot_role,
    }))
  }

  async syncCrewForNavigationLog(
    log: NavigationLog,
    payload: SyncNavigationLogCrewPayload
  ): Promise<void> {
    const requestedIds = payload.crew.map((e) => e.crewMemberId)

    // An empty list intentionally clears the trip crew (e.g. removing the last
    // member). This is a deliberate action gated by a confirmation in the UI —
    // do NOT forbid it with a validator `.minLength(1)`, that would make the last
    // crew member un-removable. The `crew` field itself is required, so a
    // malformed request that omits it is already rejected before reaching here.
    if (requestedIds.length === 0) {
      await log.related('crew').sync({})
      return
    }

    const validMembers = await CrewMember.query()
      .whereIn('id', requestedIds)
      .where('organizationId', log.organizationId)
      .select('id')

    const validIds = new Set(validMembers.map((m) => m.id))

    const pivotData: Record<number, { role: string }> = {}
    for (const entry of payload.crew) {
      if (validIds.has(entry.crewMemberId)) {
        pivotData[entry.crewMemberId] = { role: entry.role }
      }
    }
    await log.related('crew').sync(pivotData)
  }

  #toRow(member: CrewMember): CrewMemberRow {
    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      notes: member.notes,
      certifications: member.certifications.map((c) => this.#toCertRow(c)),
    }
  }

  #toCertRow(cert: CrewCertification): CrewCertificationRow {
    return {
      id: cert.id,
      type: cert.type,
      referenceNumber: cert.referenceNumber,
      expiresAt: cert.expiresAt ? cert.expiresAt.toISODate() : null,
      isExpired: cert.isExpired,
      expiresInDays: cert.expiresInDays,
    }
  }
}
