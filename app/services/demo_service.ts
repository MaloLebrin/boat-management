import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatRig from '#models/boat_rig'
import BoatSail from '#models/boat_sail'
import Organization from '#models/organization'
import User from '#models/user'
import { seedDemoData } from '#database/seeders/sandbox_seeder'
import { DEMO_EMAIL, DEMO_ORG_SLUG } from '#shared/constants/demo'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'

export default class DemoService {
  async getUser(): Promise<User | null> {
    return User.query().where('email', DEMO_EMAIL).first()
  }

  isDemoUser(email: string): boolean {
    return email === DEMO_EMAIL
  }

  async scheduleReset(): Promise<void> {
    const { default: ResetDemoData } = await import('#jobs/reset_demo_data')
    await ResetDemoData.dispatch({})
  }

  async reset(): Promise<void> {
    logger.info('DemoService: starting demo data reset')

    // Delete existing demo data atomically so a failure doesn't leave a partial state
    await db.transaction(async (trx) => {
      const user = await User.query({ client: trx }).where('email', DEMO_EMAIL).first()
      if (user) {
        await user.delete()
      }

      const org = await Organization.query({ client: trx }).where('slug', DEMO_ORG_SLUG).first()
      if (org) {
        const boats = await Boat.query({ client: trx }).where('organizationId', org.id).select('id')
        if (boats.length > 0) {
          const ids = boats.map((b) => b.id)
          // boat_engines/sails/rigs have no FK CASCADE — must delete before boats
          await BoatRig.query({ client: trx }).whereIn('boatId', ids).delete()
          await BoatSail.query({ client: trx }).whereIn('boatId', ids).delete()
          await BoatEngine.query({ client: trx }).whereIn('boatId', ids).delete()
        }
        // maintenance events/tasks/sheets cascade via FK
        await Boat.query({ client: trx }).where('organizationId', org.id).delete()
        await org.delete()
      }
    })

    // seedDemoData uses DI services internally and cannot be wrapped in the same transaction
    await seedDemoData()

    logger.info('DemoService: demo data reset complete')
  }

  async ensureExists(): Promise<User> {
    let user = await this.getUser()
    if (!user) {
      await seedDemoData()
      user = await this.getUser()
      if (!user) throw new Error('Demo user not created by seedDemoData')
    }
    return user
  }
}
