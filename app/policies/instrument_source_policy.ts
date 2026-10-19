import type User from '#models/user'
import type Boat from '#models/boat'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

/**
 * Instruments de bord Signal K (#988). La ressource est le **bateau** (la
 * source peut ne pas exister encore quand on la crée).
 *
 * - `view` : lire la source et les jauges — qui voit la fiche bateau ;
 * - `ingest` : pousser de la télémétrie et recevoir le jeton en clair — qui
 *   édite le bateau (D3) ;
 * - `manage` : enregistrer, modifier ou révoquer le serveur et son jeton —
 *   admin seulement (`instruments.manage`).
 */
export default class InstrumentSourcePolicy extends OrgScopedPolicy {
  async view(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'boats.view'))
  }

  async ingest(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'boats.edit'))
  }

  async manage(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'instruments.manage'))
  }
}
