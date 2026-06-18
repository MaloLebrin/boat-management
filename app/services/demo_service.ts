import Organization from '#models/organization'
import User from '#models/user'
import { seedDemoData } from '#database/seeders/sandbox_seeder'
import logger from '@adonisjs/core/services/logger'

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@fleetai.app'
const DEMO_ORG_SLUG = 'marina-demo'

export default class DemoService {
  async getUser(): Promise<User | null> {
    return User.query().where('email', DEMO_EMAIL).first()
  }

  async isDemoUser(userId: number): Promise<boolean> {
    const user = await User.find(userId)
    return user?.email === DEMO_EMAIL
  }

  async reset(): Promise<void> {
    logger.info('DemoService: starting demo data reset')

    const org = await Organization.query().where('slug', DEMO_ORG_SLUG).first()
    if (org) {
      await org.delete()
    }

    const user = await User.query().where('email', DEMO_EMAIL).first()
    if (user) {
      await user.delete()
    }

    await seedDemoData()
    logger.info('DemoService: demo data reset complete')
  }

  async ensureExists(): Promise<User> {
    let user = await this.getUser()
    if (!user) {
      await seedDemoData()
      user = (await this.getUser())!
    }
    return user
  }
}
