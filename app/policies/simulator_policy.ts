import type User from '#models/user'
import type SimulatorShare from '#models/simulator_share'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class SimulatorPolicy extends BasePolicy {
  viewShare(_user: User | null, _share: SimulatorShare): AuthorizerResponse {
    return true
  }

  async manageLeads(user: User): Promise<AuthorizerResponse> {
    if (!user.organizationId) return false
    return user.hasPermission(user.organizationId, 'simulator.manage_leads')
  }
}
