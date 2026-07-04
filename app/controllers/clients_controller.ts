import ClientService, { ClientNotFoundError } from '#services/client_service'
import QuotaService from '#services/quota_service'
import { QuotaExceededError } from '#exceptions/quota_errors'
import ClientPolicy from '#policies/client_policy'
import { createClientValidator, updateClientValidator } from '#validators/client'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type Organization from '#models/organization'

@inject()
export default class ClientsController {
  constructor(
    private clientService: ClientService,
    private quotaService: QuotaService
  ) {}

  private async loadOrgAndAssertEnterprise({
    auth,
    session,
    response,
    i18n,
  }: Pick<HttpContext, 'auth' | 'session' | 'response' | 'i18n'>): Promise<Organization | null> {
    const user = auth.getUserOrFail()
    await user.load('organization')

    try {
      this.quotaService.assertCanManageClients(user.organization)
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

  async index({ inertia, auth, bouncer, request, session, response, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(ClientPolicy).authorize('create')

    const filters = this.clientService.normalizeFilters(request.qs())
    const clients = await this.clientService.search(org, filters)
    const canDelete = await bouncer.with(ClientPolicy).allows('delete')

    return inertia.render('clients/index', { clients, filters, canDelete })
  }

  async store({ request, response, auth, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(ClientPolicy).authorize('create')

    const payload = await request.validateUsing(createClientValidator)
    await this.clientService.create(org, payload)

    session.flash('success', i18n.t('flash.clients.created'))
    response.redirect('/clients')
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
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
      throw error
    }

    session.flash('success', i18n.t('flash.clients.updated'))
    response.redirect('/clients')
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(ClientPolicy).authorize('delete')

    try {
      const client = await this.clientService.getForOrganizationOrFail(org, Number(params.id))
      await this.clientService.delete(client)
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
}
