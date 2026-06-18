import DemoService from '#services/demo_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class DemoController {
  constructor(private demoService: DemoService) {}

  async login({ auth, response }: HttpContext) {
    const user = await this.demoService.ensureExists()
    await auth.use('web').login(user, false)
    return response.redirect().toRoute('dashboard')
  }
}
