import type User from '#models/user'
import { BasePolicy } from '@adonisjs/bouncer'
import type { Capability } from '#shared/types/permissions'

/**
 * Socle des policies scopées organisation : un admin passe tout **dans son
 * organisation**, les autres rôles sont filtrés capability par capability.
 */
export default abstract class OrgScopedPolicy extends BasePolicy {
  /**
   * Laissez-passer admin — mais jamais hors de son organisation (#690).
   *
   * Bouncer appelle ce hook avec l'action et les arguments de la policy
   * (`before(user, action, ...args)` dans `PolicyAuthorizer#execute`), et un
   * retour booléen **court-circuite entièrement** la méthode de policy. La
   * version précédente ne lisait que `user` : un admin de l'organisation B
   * franchissait donc `bouncer.with(PortPolicy).authorize('edit', portDeA)`,
   * `sameOrg` n'étant jamais atteint. Le refus ne venait alors que du scoping
   * des services en aval — une défense en profondeur qui n'avait qu'une
   * profondeur, et aucun test ne le voyait puisque les specs appellent les
   * policies en direct, hors de Bouncer.
   */
  async before(user: User, _action: string, ...resources: unknown[]) {
    if (!user.organizationId) return
    // Non-admin : le hook ne tranche pas, la méthode de policy décide.
    if (!(await user.isAdminOf(user.organizationId))) return

    // Aucune ressource : action sans cible (`create`, `viewMembers`…). Il n'y
    // a rien à vérifier, et le laissez-passer admin s'applique — c'est un cas
    // légitime, distinct de « je n'ai pas pu vérifier » ci-dessous (#771).
    if (resources.length === 0) return true

    const scopes = resources.map((resource) => this.scopeOf(user, resource))

    // Une seule ressource étrangère suffit à refuser.
    if (scopes.includes('foreign')) return false

    // Au moins une ressource dont l'organisation n'est pas lisible : le hook
    // **ne tranche pas** et laisse la méthode de policy décider (#771).
    //
    // La version précédente les traitait comme « non étrangères », donc les
    // autorisait. L'asymétrie était assumée et documentée, mais elle voulait
    // dire que le hook ne distinguait pas « rien à vérifier » de « je n'ai
    // pas pu vérifier » — et que sur ce second cas la défense en profondeur
    // n'avait, de nouveau, qu'une profondeur.
    if (scopes.includes('unreadable')) return

    return true
  }

  protected async can(user: User, capability: Capability): Promise<boolean> {
    if (!user.organizationId) return false
    return user.hasPermission(user.organizationId, capability)
  }

  protected sameOrg(user: User, resource: { organizationId: number }): boolean {
    return user.organizationId !== null && user.organizationId === resource.organizationId
  }

  /**
   * Position d'une ressource vis-à-vis de l'organisation de l'utilisateur.
   *
   * Les trois cas sont distincts, et c'est tout le propos de #771 :
   *
   * - `same` — organisation lisible et identique : le hook peut autoriser ;
   * - `foreign` — lisible et différente : le hook refuse ;
   * - `unreadable` — non lisible : le hook **ne tranche pas**.
   */
  private scopeOf(user: User, resource: unknown): 'same' | 'foreign' | 'unreadable' {
    const organizationId = this.organizationIdOf(resource)
    if (organizationId === null) return 'unreadable'
    return organizationId === user.organizationId ? 'same' : 'foreign'
  }

  /**
   * L'organisation d'une ressource, ou `null` si elle n'est pas lisible.
   *
   * **Liste close des formes reconnues** — tout le reste est `unreadable`, et
   * le hook laisse alors la méthode de policy décider :
   *
   * 1. la colonne directe `organizationId` (`Boat`, `Port`, `Spot`,
   *    `BoatReservation`, `Invoice`… — c'est la forme de **tous** les sites
   *    d'appel actuels) ;
   * 2. la relation `port` **préchargée** — `Mouillage` et `Pontoon` n'ont pas
   *    de colonne `organization_id`, ils héritent celle de leur port ;
   * 3. la relation `boat` **préchargée** — même raisonnement pour les
   *    ressources rattachées à un bateau (`BoatEngine` et consorts, qui ne
   *    portent pas d'`organization_id` non plus).
   *
   * Étendre cette liste est préférable à laisser une forme retomber sur
   * `null` : depuis #771, `null` ne signifie plus « autorisé », il signifie
   * « c'est à la policy de voir ».
   */
  private organizationIdOf(resource: unknown): number | null {
    if (typeof resource !== 'object' || resource === null) return null

    const { organizationId, port, boat } = resource as {
      organizationId?: unknown
      port?: { organizationId?: unknown }
      boat?: { organizationId?: unknown }
    }

    if (typeof organizationId === 'number') return organizationId
    if (port && typeof port.organizationId === 'number') return port.organizationId
    if (boat && typeof boat.organizationId === 'number') return boat.organizationId

    return null
  }
}
