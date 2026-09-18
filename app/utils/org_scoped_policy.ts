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

    return resources.every((resource) => !this.isForeignResource(user, resource))
  }

  protected async can(user: User, capability: Capability): Promise<boolean> {
    if (!user.organizationId) return false
    return user.hasPermission(user.organizationId, capability)
  }

  protected sameOrg(user: User, resource: { organizationId: number }): boolean {
    return user.organizationId !== null && user.organizationId === resource.organizationId
  }

  /**
   * Une ressource n'est « étrangère » que si son organisation est **lisible et
   * différente**. L'asymétrie est délibérée : sur une ressource dont on ne sait
   * rien — argument absent, payload de validation, relation non préchargée — le
   * hook laisse passer l'admin comme avant.
   *
   * Refuser sur le doute reviendrait à faire retomber l'admin sur la méthode de
   * policy, qui refuserait par exemple un `Mouillage` dont le `port` n'est pas
   * préchargé (`MouillagePolicy.sameOrgViaPort`) : un 403 tout neuf sur un
   * chemin aujourd'hui autorisé, pour un durcissement que personne n'a demandé.
   */
  private isForeignResource(user: User, resource: unknown): boolean {
    const organizationId = this.organizationIdOf(resource)
    return organizationId !== null && organizationId !== user.organizationId
  }

  /**
   * L'organisation d'une ressource, ou `null` si elle n'est pas lisible.
   *
   * Deux formes couvrent le modèle de données : la colonne directe, et la
   * relation `port` chargée — `Mouillage` et `Pontoon` n'ont pas de colonne
   * `organization_id`, ils héritent celle de leur port. `Spot`, lui, en porte
   * une (`NOT NULL`) et passe donc par la première forme.
   */
  private organizationIdOf(resource: unknown): number | null {
    if (typeof resource !== 'object' || resource === null) return null

    const { organizationId, port } = resource as {
      organizationId?: unknown
      port?: { organizationId?: unknown }
    }

    if (typeof organizationId === 'number') return organizationId
    if (port && typeof port.organizationId === 'number') return port.organizationId

    return null
  }
}
