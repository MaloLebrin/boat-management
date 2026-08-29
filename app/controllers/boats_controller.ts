import { SpotNotFoundError } from '#exceptions/port_errors'
import { boatOwnerPortalRedirect } from '#utils/staff_route_guard'
import { deferJson } from '#utils/inertia_defer'
import { QuotaExceededError } from '#exceptions/quota_errors'
import AiAnalysisService from '#services/ai_analysis_service'
import AuditLogService from '#services/audit_log_service'
import BoatCatalogService from '#services/boat_catalog_service'
import BoatDocumentService from '#services/boat_document_service'
import BoatEquipmentActionService from '#services/boat_equipment_action_service'
import BoatFuelLogService from '#services/boat_fuel_log_service'
import BoatListService from '#services/boat_list_service'
import BoatOwnerService from '#services/boat_owner_service'
import BoatPricingService from '#services/boat_pricing_service'
import NavigationLogService from '#services/navigation_log_service'
import CrewService from '#services/crew_service'
import {
  toEditForm,
  toEquipmentActionRows,
  toFuelLogRows,
  toIncidentRows,
  toMaintenanceEventRows,
  toMaintenanceSheetRows,
  toMaintenanceTaskRows,
  toNavigationLogRows,
  toShowShellProps,
} from '#transformers/boat_transformer'
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
import { toAppLocale } from '#shared/helpers/locale_path'
import type { AiSuggestion } from '#shared/types/ai'
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
    private boatOwnerService: BoatOwnerService,
    private boatCatalogService: BoatCatalogService
  ) {}

  async index({ inertia, auth, request, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    const portalRedirect = await boatOwnerPortalRedirect(user)
    if (portalRedirect) return response.redirect(portalRedirect)

    await bouncer.with(BoatPolicy).authorize('view')

    const [{ boats, filters }, boatQuota] = await Promise.all([
      this.boatListService.listForUser(user, request.qs()),
      user.organization
        ? this.quotaService.getBoatUsage(user.organization)
        : Promise.resolve({ used: 0, limit: 0 }),
    ])

    const canAddBoat = boatQuota.limit === null || boatQuota.used < boatQuota.limit

    return inertia.render('boats/index', {
      boats,
      filters,
      canAddBoat,
      boatQuota,
    })
  }

  async create({ inertia, auth, bouncer, response, session, i18n, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.with(BoatPolicy).authorize('create')
    await user.load('organization')

    if (!user.organization || !(await this.quotaService.canAddBoat(user.organization))) {
      session.flash('error', i18n.t('flash.quota.boatsExceeded'))
      session.flash('errorAction', '/settings/billing')
      return response.redirect('/boats')
    }

    const [ports, portOptions, brands, catalog] = await Promise.all([
      this.portService.listWithSpotsForOrg(user),
      this.portService.listNamesForOrg(user),
      this.boatCatalogService.listBrands(),
      this.resolveCatalogModels(request.qs().brandId),
    ])

    return inertia.render('boats/new', {
      ports: toPortFormOptions(ports),
      portOptions,
      brands,
      catalogModels: catalog.models,
      catalogBrandId: catalog.brandId,
    })
  }

  /**
   * Modèles de la marque sélectionnée, rechargés par le formulaire via
   * `router.reload({ only: ['catalogModels'], data: { brandId } })` (#571) —
   * aucune route `/api` ni `fetch` n'est nécessaire côté Inertia.
   *
   * À l'édition, aucun `brandId` n'est encore dans l'URL : on rapproche alors
   * le `manufacturer` déjà saisi d'une marque du catalogue, pour que la liste
   * des modèles soit utile dès l'ouverture du formulaire.
   */
  private async resolveCatalogModels(rawBrandId: unknown, manufacturer?: string | null) {
    const requestedId = Number(rawBrandId)
    if (Number.isInteger(requestedId) && requestedId > 0) {
      return {
        brandId: requestedId,
        models: await this.boatCatalogService.listModels({ brandId: requestedId }),
      }
    }

    const brand = await this.boatCatalogService.resolveBrand(manufacturer)
    if (!brand) return { brandId: null, models: [] }

    return {
      brandId: brand.id,
      models: await this.boatCatalogService.listModels({ brandId: brand.id }),
    }
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
        session.flash('errorAction', '/settings/billing')
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

  /**
   * La fiche bateau ne charge plus ses ~20 jeux de données d'onglet dans la
   * réponse initiale (#463) : seul le squelette (bateau, photos, position,
   * droits) est attendu, le reste est différé en deux groupes chargés en
   * parallèle juste après le rendu. La page peint donc immédiatement avec ses
   * onglets et un skeleton, au lieu de rester blanche plusieurs secondes.
   */
  async show({ inertia, params, request, auth, response, bouncer, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const boat = await this.boatService.getFullDetailForUser(user, Number(params.id))
      await bouncer.with(BoatPolicy).authorize('view', boat)

      await user.load('organization')

      const [
        boatMedia,
        positionHistory,
        homePortId,
        canManageMaintenance,
        pricingRow,
        canManageEquipmentActions,
        canDeleteEquipmentActions,
        canDeleteIncidents,
        canCreateFuelLogs,
        canDeleteFuelLogs,
        canCreateNavigationLogs,
        canUpdateNavigationLogs,
        canDeleteNavigationLogs,
      ] = await Promise.all([
        this.mediaService.listForEntity('boat', boat.id),
        this.boatService.getPositionHistory(boat.id),
        this.portService.findIdByName(user, boat.homePort),
        bouncer.with(BoatPolicy).allows('edit', boat),
        this.pricingService.getForBoat(boat),
        bouncer.with(EquipmentActionPolicy).allows('create', boat),
        bouncer.with(EquipmentActionPolicy).allows('delete', boat),
        bouncer.with(IncidentPolicy).allows('delete', boat),
        bouncer.with(FuelLogPolicy).allows('create', boat),
        bouncer.with(FuelLogPolicy).allows('delete', boat),
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
      const tabParam = request.qs().tab
      const initialTab = typeof tabParam === 'string' && tabParam !== '' ? tabParam : null

      return inertia.render('boats/show', {
        ...toShowShellProps(boat, {
          positionHistory,
          boatMedia,
          homePortId,
          canManageMaintenance,
          canManageEquipment,
          canManageDocuments,
          canExport,
          pricing,
          pricingEnabled,
          canManagePricing,
          canManageEquipmentActions,
          canDeleteEquipmentActions,
          canDeleteIncidents,
          canCreateFuelLogs,
          canDeleteFuelLogs,
          canCreateNavigationLogs,
          canUpdateNavigationLogs,
          canDeleteNavigationLogs,
          initialTab,
        }),

        // Groupe « maintenance » : onglets Aperçu, Historique, Tâches, Fiches,
        // Actions équipement et Documents administratifs.
        maintenanceEvents: inertia.defer(
          deferJson(async () =>
            toMaintenanceEventRows(await this.maintenanceService.listForBoat(user, boat))
          ),
          'maintenance'
        ),
        maintenanceTasks: inertia.defer(
          deferJson(async () =>
            toMaintenanceTaskRows(await this.taskService.listForBoat(user, boat))
          ),
          'maintenance'
        ),
        maintenanceSheets: inertia.defer(
          deferJson(async () =>
            toMaintenanceSheetRows(await this.sheetService.listForBoat(user, boat))
          ),
          'maintenance'
        ),
        boatDocuments: inertia.defer(
          deferJson(() => this.documentService.listForBoat(user, boat)),
          'maintenance'
        ),
        equipmentActions: inertia.defer(
          deferJson(async () =>
            toEquipmentActionRows(await this.equipmentActionService.listForBoat(user, boat))
          ),
          'maintenance'
        ),
        // Jamais `null` ici : le serializer d'Inertia jette « Cannot serialize
        // an item with null value » quand un callback différé résout `null`
        // (#478) — l'absence d'analyse est donc portée par la liste vide.
        aiSuggestions: inertia.defer(
          deferJson(async () => {
            if (!user.organizationId) return []
            const latest = await this.aiAnalysisService.getLatestBoatSuggestions(
              user.id,
              boat.id,
              user.organizationId,
              toAppLocale(i18n.locale)
            )
            return latest ? (JSON.parse(latest.responseText) as AiSuggestion[]) : []
          }),
          'maintenance'
        ),

        // Groupe « navigation » : onglets Journal de bord, Carburant, Incidents.
        navigationLogs: inertia.defer(
          deferJson(async () =>
            toNavigationLogRows(await this.navigationLogService.listForBoat(boat))
          ),
          'navigation'
        ),
        fuelLogs: inertia.defer(
          deferJson(async () => toFuelLogRows(await this.fuelLogService.listForBoat(user, boat))),
          'navigation'
        ),
        incidents: inertia.defer(
          deferJson(async () => toIncidentRows(await this.incidentService.listForBoat(user, boat))),
          'navigation'
        ),
        portOptions: inertia.defer(
          deferJson(async () => {
            const ports = await this.portService.listNamesForOrg(user)
            return ports.map((p) => ({ id: p.id, name: p.name }))
          }),
          'navigation'
        ),
        crewMemberOptions: inertia.defer(
          deferJson(() => this.crewService.listOptionsForOrganization(user.organization)),
          'navigation'
        ),
      })
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }
  }

  async edit({ inertia, params, auth, response, bouncer, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const boat = await this.boatService.getForUserOrFail(user, Number(params.id))
      await bouncer.with(BoatPolicy).authorize('edit', boat)

      const [ports, portOptions, owners, ownerCandidates, brands, catalog] = await Promise.all([
        this.portService.listWithSpotsForOrg(user),
        this.portService.listNamesForOrg(user),
        this.boatOwnerService.listOwners(boat),
        this.boatOwnerService.listEligibleOwnerCandidates(boat),
        this.boatCatalogService.listBrands(),
        this.resolveCatalogModels(request.qs().brandId, boat.manufacturer),
      ])

      return inertia.render('boats/edit', {
        boat: toEditForm(boat),
        ports: toPortFormOptions(ports),
        portOptions,
        brands,
        catalogModels: catalog.models,
        catalogBrandId: catalog.brandId,
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
