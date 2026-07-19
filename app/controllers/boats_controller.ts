import { SpotNotFoundError } from '#exceptions/port_errors'
import { QuotaExceededError } from '#exceptions/quota_errors'
import AiAnalysisService, { type AiSuggestion } from '#services/ai_analysis_service'
import AuditLogService from '#services/audit_log_service'
import BoatDocumentService from '#services/boat_document_service'
import BoatEquipmentActionService from '#services/boat_equipment_action_service'
import BoatFuelLogService from '#services/boat_fuel_log_service'
import BoatListService from '#services/boat_list_service'
import BoatOwnerService from '#services/boat_owner_service'
import BoatPricingService from '#services/boat_pricing_service'
import NavigationLogService from '#services/navigation_log_service'
import CrewService from '#services/crew_service'
import { toEditForm, toShowProps } from '#transformers/boat_transformer'
import { toBoatPricingRow } from '#transformers/boat_pricing_transformer'
import { toPortFormOptions } from '#transformers/port_transformer'
import BoatIncidentService from '#services/boat_incident_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatMaintenanceSheetService from '#services/boat_maintenance_sheet_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import { RegistrationNumberTakenError } from '#exceptions/boat_errors'
import MediaService from '#services/media_service'
import OrganizationService from '#services/organization_service'
import PortService from '#services/port_service'
import QuotaService from '#services/quota_service'
import SpotService from '#services/spot_service'
import BoatPolicy from '#policies/boat_policy'
import EquipmentActionPolicy from '#policies/equipment_action_policy'
import FuelLogPolicy from '#policies/fuel_log_policy'
import IncidentPolicy from '#policies/incident_policy'
import NavigationLogPolicy from '#policies/navigation_log_policy'
import { createBoatValidator, updateBoatValidator } from '#validators/boat'
import { assignBoatValidator } from '#validators/marina_layout'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatsController {
  constructor(
    private boatService: BoatService,
    private maintenanceService: BoatMaintenanceService,
    private taskService: BoatMaintenanceTaskService,
    private sheetService: BoatMaintenanceSheetService,
    private incidentService: BoatIncidentService,
    private fuelLogService: BoatFuelLogService,
    private mediaService: MediaService,
    private aiAnalysisService: AiAnalysisService,
    private boatListService: BoatListService,
    private portService: PortService,
    private spotService: SpotService,
    private quotaService: QuotaService,
    private organizationService: OrganizationService,
    private auditLogService: AuditLogService,
    private documentService: BoatDocumentService,
    private crewService: CrewService,
    private navigationLogService: NavigationLogService,
    private pricingService: BoatPricingService,
    private equipmentActionService: BoatEquipmentActionService,
    private boatOwnerService: BoatOwnerService
  ) {}

  async index({ inertia, auth, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    const [{ boats, filters }, canAddBoat] = await Promise.all([
      this.boatListService.listForUser(user, request.qs()),
      user.organization ? this.quotaService.canAddBoat(user.organization) : Promise.resolve(false),
    ])

    return inertia.render('boats/index', {
      boats,
      filters,
      canAddBoat,
    })
  }

  async create({ inertia, auth, bouncer, response, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(BoatPolicy).authorize('create')
    await user.load('organization')

    if (!user.organization || !(await this.quotaService.canAddBoat(user.organization))) {
      session.flash('error', i18n.t('flash.quota.boatsExceeded'))
      return response.redirect('/boats')
    }

    const ports = await this.portService.listWithSpotsForOrg(user)

    return inertia.render('boats/new', {
      ports: toPortFormOptions(ports),
    })
  }

  async store({ request, response, auth, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(BoatPolicy).authorize('create')

    await user.load('organization')
    try {
      await this.quotaService.assertCanAddBoat(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t(`flash.quota.${error.feature}Exceeded`))
        return response.redirect().back()
      }
      throw error
    }

    const payload = await request.validateUsing(createBoatValidator)

    try {
      const boat = await this.boatService.createForUser(user, payload)

      await this.auditLogService.log({
        organizationId: user.organizationId!,
        userId: user.id,
        action: 'boat.create',
        entityType: 'boat',
        entityId: boat.id,
        metadata: { name: boat.name },
      })

      response.redirect(`/boats/${boat.id}`)
    } catch (error) {
      if (error instanceof SpotNotFoundError) {
        session.flash('error', i18n.t('flash.spot.notInOrg'))
        return response.redirect().back()
      }
      if (error instanceof RegistrationNumberTakenError) {
        session.flash('error', i18n.t('flash.boat.registrationTaken'))
        return response.redirect().back()
      }
      throw error
    }
  }

  async show({ inertia, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const boat = await this.boatService.getFullDetailForUser(user, Number(params.id))
      await bouncer.with(BoatPolicy).authorize('view', boat)

      await user.load('organization')

      const [
        maintenanceEvents,
        maintenanceTasks,
        maintenanceSheets,
        boatMedia,
        positionHistory,
        latestSuggestions,
        canManageMaintenance,
        boatDocuments,
        pricingRow,
        equipmentActions,
        canManageEquipmentActions,
        canDeleteEquipmentActions,
        incidents,
        fuelLogs,
        canDeleteIncidents,
        canCreateFuelLogs,
        canDeleteFuelLogs,
        crewMemberOptions,
        navigationLogs,
        ports,
        canCreateNavigationLogs,
        canUpdateNavigationLogs,
        canDeleteNavigationLogs,
      ] = await Promise.all([
        this.maintenanceService.listForBoat(user, boat),
        this.taskService.listForBoat(user, boat),
        this.sheetService.listForBoat(user, boat),
        this.mediaService.listForEntity('boat', boat.id),
        this.boatService.getPositionHistory(boat.id),
        user.organizationId
          ? this.aiAnalysisService.getLatestBoatSuggestions(user.id, boat.id, user.organizationId)
          : Promise.resolve(null),
        bouncer.with(BoatPolicy).allows('edit', boat),
        this.documentService.listForBoat(user, boat),
        this.pricingService.getForBoat(boat),
        this.equipmentActionService.listForBoat(user, boat),
        bouncer.with(EquipmentActionPolicy).allows('create', boat),
        bouncer.with(EquipmentActionPolicy).allows('delete', boat),
        this.incidentService.listForBoat(user, boat),
        this.fuelLogService.listForBoat(user, boat),
        bouncer.with(IncidentPolicy).allows('delete', boat),
        bouncer.with(FuelLogPolicy).allows('create', boat),
        bouncer.with(FuelLogPolicy).allows('delete', boat),
        this.crewService.listOptionsForOrganization(user.organization),
        this.navigationLogService.listForBoat(boat),
        this.portService.listNamesForOrg(user),
        bouncer.with(NavigationLogPolicy).allows('create', boat),
        bouncer.with(NavigationLogPolicy).allows('update', boat),
        bouncer.with(NavigationLogPolicy).allows('delete'),
      ])

      const canManageEquipment = canManageMaintenance
      const canManageDocuments = canManageMaintenance
      const canExport = user.organization ? this.quotaService.canExport(user.organization) : false
      const pricingEnabled = user.organization
        ? await this.quotaService.canManagePricing(user.organization)
        : false
      const canManagePricing = pricingEnabled && canManageMaintenance
      const pricing = pricingRow ? toBoatPricingRow(pricingRow) : null
      const aiSuggestions: AiSuggestion[] | null = latestSuggestions
        ? (JSON.parse(latestSuggestions.responseText) as AiSuggestion[])
        : null
      const portOptions = ports.map((p) => ({ id: p.id, name: p.name }))

      return inertia.render(
        'boats/show',
        toShowProps(boat, {
          positionHistory,
          boatMedia,
          maintenanceEvents,
          maintenanceTasks,
          maintenanceSheets,
          boatDocuments,
          aiSuggestions,
          canManageMaintenance,
          canManageEquipment,
          canManageDocuments,
          canExport,
          pricing,
          pricingEnabled,
          canManagePricing,
          equipmentActions,
          canManageEquipmentActions,
          canDeleteEquipmentActions,
          incidents,
          fuelLogs,
          navigationLogs,
          portOptions,
          crewMemberOptions,
          canDeleteIncidents,
          canCreateFuelLogs,
          canDeleteFuelLogs,
          canCreateNavigationLogs,
          canUpdateNavigationLogs,
          canDeleteNavigationLogs,
        })
      )
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }
  }

  async edit({ inertia, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const boat = await this.boatService.getForUserOrFail(user, Number(params.id))
      await bouncer.with(BoatPolicy).authorize('edit', boat)

      const [ports, owners, ownerCandidates] = await Promise.all([
        this.portService.listWithSpotsForOrg(user),
        this.boatOwnerService.listOwners(boat),
        this.boatOwnerService.listEligibleOwnerCandidates(boat),
      ])

      return inertia.render('boats/edit', {
        boat: toEditForm(boat),
        ports: toPortFormOptions(ports),
        owners: owners.map((owner) => ({
          id: owner.id,
          fullName: owner.fullName,
          email: owner.email,
        })),
        ownerCandidates: ownerCandidates.map((candidate) => ({
          id: candidate.id,
          fullName: candidate.fullName,
          email: candidate.email,
        })),
      })
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }
  }

  async update({ request, params, auth, response, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.boatService.getForUserOrFail(user, Number(params.id))
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const payload = await request.validateUsing(updateBoatValidator)

    try {
      await this.boatService.updateForUser(user, boat, payload)

      await this.auditLogService.log({
        organizationId: user.organizationId!,
        userId: user.id,
        action: 'boat.update',
        entityType: 'boat',
        entityId: boat.id,
        metadata: { name: boat.name },
      })

      response.redirect(`/boats/${boat.id}`)
    } catch (error) {
      if (error instanceof SpotNotFoundError) {
        session.flash('error', i18n.t('flash.spot.notInOrg'))
        return response.redirect().back()
      }
      if (error instanceof RegistrationNumberTakenError) {
        session.flash('error', i18n.t('flash.boat.registrationTaken'))
        return response.redirect().back()
      }
      throw error
    }
  }

  async destroy({ params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const boat = await this.boatService.getForUserOrFail(user, Number(params.id))
      await bouncer.with(BoatPolicy).authorize('delete', boat)

      const org = await this.organizationService.findOrFail(boat.organizationId)
      const boatName = boat.name
      const boatId = boat.id
      await this.boatService.deleteForUser(user, boat, org)

      await this.auditLogService.log({
        organizationId: user.organizationId!,
        userId: user.id,
        action: 'boat.delete',
        entityType: 'boat',
        entityId: boatId,
        metadata: { name: boatName },
      })

      response.redirect('/boats')
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }
  }

  async assign({ request, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const boat = await this.boatService.getForUserOrFail(user, Number(params.id))
      await bouncer.with(BoatPolicy).authorize('edit', boat)
      const payload = await request.validateUsing(assignBoatValidator)

      if (payload.spotId !== null) {
        await this.spotService.getForUserOrFail(user, payload.spotId)
      }

      await this.boatService.updateAssignment(boat, { spotId: payload.spotId })
      return response.redirect().back()
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      if (error instanceof SpotNotFoundError) return response.redirect().back()
      throw error
    }
  }
}
