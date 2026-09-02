import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Confronte le barème du code (`PLAN_PRICES`, `MODULE_PRICES`, `ADDON_PRICES`)
 * aux prix du catalogue Stripe (#612). Le code affiche des montants, Stripe en
 * facture d'autres : cette commande est le seul point où les deux se regardent.
 * Sort en code 1 dès qu'un montant, une devise ou un intervalle diverge, pour
 * pouvoir être branchée en CI ou lancée avant tout changement de prix.
 */
export default class CheckPricing extends BaseCommand {
  static commandName = 'pricing:check'
  static description = 'Vérifie que les prix affichés correspondent au catalogue Stripe'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { default: PricingCatalogService } = await import('#services/pricing_catalog_service')
    const service = await this.app.container.make(PricingCatalogService)

    const report = await service.check()

    for (const price of report.matched) {
      this.logger.success(`${price.label} — ${this.euros(price.amountCents)}`)
    }

    for (const price of report.skipped) {
      this.logger.info(`${price.label} — non vérifié (${price.envVar} non renseigné)`)
    }

    for (const mismatch of report.mismatches) {
      this.logger.error(
        `${mismatch.label} (${mismatch.priceId}) — ${mismatch.reason} : ` +
          `attendu ${mismatch.expected}, Stripe annonce ${mismatch.actual}`
      )
    }

    if (report.mismatches.length > 0) {
      this.logger.error(`${report.mismatches.length} prix divergent(s) entre le code et Stripe.`)
      this.exitCode = 1
      return
    }

    if (report.matched.length === 0) {
      this.logger.warning(
        'Aucun prix vérifié : renseignez les variables STRIPE_*_PRICE_ID pour que la commande ait un objet.'
      )
      return
    }

    this.logger.success(`${report.matched.length} prix conformes au catalogue Stripe.`)
  }

  /** Rend un montant Stripe (centimes) sous sa forme affichée. */
  private euros(cents: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
      cents / 100
    )
  }
}
