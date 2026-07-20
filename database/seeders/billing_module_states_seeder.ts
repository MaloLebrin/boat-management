import OrganizationModuleService from '#services/organization_module_service'
import app from '@adonisjs/core/services/app'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { TEST_PASSWORD } from '#database/seeders_support/billing_module_states/constants'
import { seedCoreStates } from '#database/seeders_support/billing_module_states/seed_core_states'
import { seedModuleBusinessData } from '#database/seeders_support/billing_module_states/seed_module_business_data'
import { seedQuotaEdgeCases } from '#database/seeders_support/billing_module_states/seed_quota_edge_cases'
import { seedSubscriptionStatuses } from '#database/seeders_support/billing_module_states/seed_subscription_statuses'

/**
 * Matérialise chaque état de la matrice plan/abonnement/module de
 * `/settings/billing` (cf. fix #402) + les données métier des modules
 * charter/CRM actifs, pour QA manuelle sans passer par Stripe. Ne touche pas
 * aux orgs de `test_plans_seeder.ts`.
 *
 * Le détail de chaque section vit dans
 * `database/seeders_support/billing_module_states/` (jamais scanné par
 * `db:seed`, contrainte @adonisjs/lucid — voir docs/dev/seeders.md).
 */
export default class BillingModuleStatesSeeder extends BaseSeeder {
  static environment = ['development', 'test']

  async run() {
    const moduleService = await app.container.make(OrganizationModuleService)

    const coreStates = await seedCoreStates(moduleService)
    await seedSubscriptionStatuses()
    await seedQuotaEdgeCases()
    await seedModuleBusinessData(coreStates)

    console.log('\n✅ BillingModuleStatesSeeder terminé')
    console.log(`   Mot de passe pour tous les comptes : ${TEST_PASSWORD}`)
  }
}
