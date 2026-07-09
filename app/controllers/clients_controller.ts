import ClientService, {
  ClientAlreadyAnonymizedError,
  ClientNotFoundError,
} from '#services/client_service'
import BoatReservationService from '#services/boat_reservation_service'
import QuotaService from '#services/quota_service'
import { QuotaExceededError } from '#exceptions/quota_errors'
import ClientPolicy from '#policies/client_policy'
import { createClientValidator, updateClientValidator } from '#validators/client'
import { toClientRow } from '#transformers/client_transformer'
import { toBoatReservationRow } from '#transformers/boat_reservation_transformer'
import { toMediaRow } from '#transformers/media_row_transformer'
import MediaService from '#services/media_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type Organization from '#models/organization'

@inject()
export default class ClientsController {
  constructor(
    private clientService: ClientService,
    private reservationService: BoatReservationService,
    private quotaService: QuotaService,
    private mediaService: MediaService
  ) {}

  /**
   * Écriture : exige le module CRM actif (tier ou add-on #327). Bloque toute
   * création/édition/suppression dès que le module est résilié.
   */
  private async loadOrgForWrite({
    auth,
    session,
    response,
    i18n,
  }: Pick<HttpContext, 'auth' | 'session' | 'response' | 'i18n'>): Promise<Organization | null> {
    const user = auth.getUserOrFail()
    await user.load('organization')

    try {
      await this.quotaService.assertCanManageClients(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.clientsExceeded'))
        response.redirect('/')
        return null
      }
      throw error
    }

    return user.organization
  }

  /**
   * Lecture : autorisée si le module est actif OU si l'organisation possède déjà
   * des fiches clients — accès résiduel en lecture seule après résiliation
   * (#332, lot 5b). Renvoie aussi `canManage` pour piloter l'UI (mode read-only).
   */
  private async loadOrgForRead({
    auth,
    session,
    response,
    i18n,
  }: Pick<HttpContext, 'auth' | 'session' | 'response' | 'i18n'>): Promise<{
    org: Organization
    canManage: boolean
  } | null> {
    const user = auth.getUserOrFail()
    await user.load('organization')
    const org = user.organization

    if (org === null) {
      session.flash('error', i18n.t('flash.quota.clientsExceeded'))
      response.redirect('/')
      return null
    }

    const canManage = await this.quotaService.canManageClients(org)
    if (!canManage && !(await this.clientService.hasAnyForOrg(org.id))) {
      session.flash('error', i18n.t('flash.quota.clientsExceeded'))
      response.redirect('/')
      return null
    }

    return { org, canManage }
  }

  async index({ inertia, auth, bouncer, request, session, response, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadOrgForRead({ auth, session, response, i18n })
    if (!loaded) return
    const { org, canManage: moduleActive } = loaded

    await bouncer.with(ClientPolicy).authorize('create')

    const filters = this.clientService.normalizeFilters(request.qs())
    const clients = await this.clientService.search(org, filters)
    const canDelete = moduleActive && (await bouncer.with(ClientPolicy).allows('delete'))

    return inertia.render('clients/index', { clients, filters, canDelete, readOnly: !moduleActive })
  }

  async show({ inertia, auth, bouncer, params, session, response, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadOrgForRead({ auth, session, response, i18n })
    if (!loaded) return
    const { org, canManage: moduleActive } = loaded

    await bouncer.with(ClientPolicy).authorize('create')

    // Le module résilié force la lecture seule, même pour un admin.
    const canManage = moduleActive && (await bouncer.with(ClientPolicy).allows('update'))
    const canAnonymize = moduleActive && (await bouncer.with(ClientPolicy).allows('anonymize'))

    try {
      const client = await this.clientService.getForOrganizationOrFail(org, Number(params.id))
      const reservations = await this.reservationService.listForClient(org.id, client.id)
      const documents = await this.mediaService.listForEntity('client', client.id)
      return inertia.render('clients/show', {
        client: toClientRow(client),
        reservations: reservations.map((r) => toBoatReservationRow(r, r.boat?.name ?? '')),
        documents: documents.map(toMediaRow),
        canManage,
        canAnonymize,
        readOnly: !moduleActive,
      })
    } catch (error) {
      if (error instanceof ClientNotFoundError) {
        session.flash('error', i18n.t('flash.clients.notFound'))
        response.redirect('/clients')
        return
      }
      throw error
    }
  }

  async store({ request, response, auth, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgForWrite({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(ClientPolicy).authorize('create')

    const payload = await request.validateUsing(createClientValidator)
    await this.clientService.create(org, payload)

    session.flash('success', i18n.t('flash.clients.created'))
    response.redirect('/clients')
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgForWrite({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(ClientPolicy).authorize('update')

    try {
      const client = await this.clientService.getForOrganizationOrFail(org, Number(params.id))
      const payload = await request.validateUsing(updateClientValidator)
      await this.clientService.update(client, payload)
    } catch (error) {
      if (error instanceof ClientNotFoundError) {
        session.flash('error', i18n.t('flash.clients.notFound'))
        response.redirect('/clients')
        return
      }
      if (error instanceof ClientAlreadyAnonymizedError) {
        session.flash('error', i18n.t('flash.clients.alreadyAnonymized'))
        response.redirect('/clients')
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.clients.updated'))
    response.redirect('/clients')
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgForWrite({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(ClientPolicy).authorize('delete')

    try {
      const client = await this.clientService.getForOrganizationOrFail(org, Number(params.id))
      await this.clientService.delete(org, client)
    } catch (error) {
      if (error instanceof ClientNotFoundError) {
        session.flash('error', i18n.t('flash.clients.notFound'))
        response.redirect('/clients')
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.clients.deleted'))
    response.redirect('/clients')
  }

  async anonymize({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgForWrite({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(ClientPolicy).authorize('anonymize')

    try {
      const client = await this.clientService.getForOrganizationOrFail(org, Number(params.id))
      await this.clientService.anonymize(org, client)
    } catch (error) {
      if (error instanceof ClientNotFoundError) {
        session.flash('error', i18n.t('flash.clients.notFound'))
        response.redirect('/clients')
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.clients.anonymized'))
    response.redirect('/clients')
  }

  async exportData({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    // Export RGPD des données existantes : autorisé en lecture seule (droit légal).
    const loaded = await this.loadOrgForRead({ auth, session, response, i18n })
    if (!loaded) return
    const { org } = loaded

    await bouncer.with(ClientPolicy).authorize('update')

    let client
    try {
      client = await this.clientService.getForOrganizationOrFail(org, Number(params.id))
    } catch (error) {
      if (error instanceof ClientNotFoundError) {
        session.flash('error', i18n.t('flash.clients.notFound'))
        response.redirect('/clients')
        return
      }
      throw error
    }

    const data = await this.clientService.exportData(org, client)
    response.header('Content-Type', 'application/json')
    response.header('Content-Disposition', `attachment; filename="client-${client.id}.json"`)
    return response.send(JSON.stringify(data, null, 2))
  }
}
