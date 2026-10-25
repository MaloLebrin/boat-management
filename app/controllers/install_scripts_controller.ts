import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import InstallScriptService from '#services/install_script_service'

@inject()
export default class InstallScriptsController {
  constructor(private installScriptService: InstallScriptService) {}

  /** `GET /install/signalk-plugin.sh` — script d'installation du plugin Signal K (#1021). */
  async signalkPlugin({ request, response }: HttpContext) {
    const origin = `${request.protocol()}://${request.host()}`
    response.header('Content-Type', 'text/x-shellscript; charset=utf-8')
    response.header('Cache-Control', 'public, max-age=3600')
    return response.send(await this.installScriptService.signalkPlugin(origin))
  }
}
