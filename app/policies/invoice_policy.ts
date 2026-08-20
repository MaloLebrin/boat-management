import type User from '#models/user'
import type Invoice from '#models/invoice'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class InvoicePolicy extends OrgScopedPolicy {
  async view(user: User, invoice?: Invoice): Promise<AuthorizerResponse> {
    if (!(await this.can(user, 'invoices.view'))) return false
    if (!invoice) return true
    return this.sameOrg(user, invoice)
  }

  async create(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'invoices.create')
  }

  async update(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'invoices.update')
  }

  async delete(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'invoices.delete')
  }
}
