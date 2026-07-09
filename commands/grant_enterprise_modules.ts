import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Grandfathering de l'offre modulaire (#327, lot 5c) : accorde tous les modules
 * add-ons en `source = 'granted'` aux organisations Enterprise existantes, pour
 * qu'aucune ne perde de fonctionnalité. À lancer une fois au déploiement.
 * Idempotent : relançable sans effet de bord.
 */
export default class GrantEnterpriseModules extends BaseCommand {
  static commandName = 'modules:grant-enterprise'
  static description =
    'Accorde tous les modules add-ons (granted) aux organisations Enterprise existantes'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { default: OrganizationModuleService } =
      await import('#services/organization_module_service')
    const service = await this.app.container.make(OrganizationModuleService)

    const { organizations, modulesGranted } = await service.grantModulesToEnterpriseOrgs()

    this.logger.success(
      `Grandfathering terminé : ${modulesGranted} module(s) accordé(s) sur ${organizations} organisation(s) Enterprise.`
    )
  }
}
