import Organization from '#models/organization'
import User from '#models/user'
import { seedDemoData } from '#database/seeders/sandbox_seeder'
import { DEMO_EMAIL, DEMO_ORG_SLUG } from '#shared/constants/demo'
import logger from '@adonisjs/core/services/logger'

export default class DemoService {
  async getUser(): Promise<User | null> {
    return User.query().where('email', DEMO_EMAIL).first()
  }

  isDemoUser(email: string): boolean {
    return email === DEMO_EMAIL
  }

  async reset(): Promise<void> {
    logger.info('DemoService: starting demo data reset')

    const user = await User.query().where('email', DEMO_EMAIL).first()
    if (user) {
      await user.delete()
    }

    const org = await Organization.query().where('slug', DEMO_ORG_SLUG).first()
    if (org) {
      await org.delete()
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
