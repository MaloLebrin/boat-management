import type User from '#models/user'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class OrganizationPolicy extends OrgScopedPolicy {
  async viewMembers(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'members.view')
  }

  async manageMembers(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'members.manage')
  }

  async configureAI(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'ai.configure')
  }

  async configureBranding(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'branding.configure')
  }

  /**
   * Renommer l'organisation (`PUT /settings/org`, #761) — admin seul.
   *
   * Distinct de `viewMembers`, qui ouvre l'écran : un member consulte
   * `/settings/org` sans pouvoir réécrire la raison sociale qui figure sur les
   * factures émises et les PDF. Distinct aussi de `manageMembers` — gérer un
   * annuaire et changer l'identité contractuelle ne sont pas le même geste.
   */
  async manageOrganization(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'organization.manage')
  }

  /**
   * Import CSV (`/settings/import`) — admin seul (#715). L'import écrit en
   * masse dans l'historique d'entretien, que seul `maintenance.delete` permet
   * ensuite de corriger : ouvrir l'écriture plus largement que la correction
   * laisserait un historique que son auteur ne peut pas défaire.
   */
  async runImport(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'import.run')
  }

  async viewAuditLog(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'audit_log.view')
  }

  async manageBilling(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'subscription.manage')
  }
}
