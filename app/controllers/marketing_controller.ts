import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import QuotaService from '#services/quota_service'
import SimulatorLeadService from '#services/simulator_lead_service'
import MarketingContentService from '#services/marketing_content_service'

@inject()
export default class MarketingController {
  constructor(
    private content: MarketingContentService,
    private quotaService: QuotaService,
    private simulatorLeadService: SimulatorLeadService
  ) {}

  async home({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/home', {
      t: this.content.homePage(i18n),
    })
  }

  async pricing({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/pricing', {
      t: this.content.pricingPage(i18n),
    })
  }

  async about({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/about', {
      t: this.content.aboutPage(i18n),
    })
  }

  async contact({ inertia, i18n, session }: HttpContext) {
    return inertia.render('marketing/contact', {
      t: this.content.contactPage(i18n),
      // Rendu après le POST /contact : le panneau de confirmation survit ainsi
      // à un rechargement complet, sans dépendre de l'état client (#450).
      contactSent: Boolean(session.flashMessages.get('contactMessageSent')),
    })
  }

  async guide({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/guide', this.content.guidePage(i18n))
  }

  async help({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/help', this.content.helpPage(i18n))
  }

  async privacy({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/privacy', this.content.privacyPage(i18n))
  }

  async terms({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/terms', this.content.termsPage(i18n))
  }

  async legalNotice({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/legal_notice', this.content.legalNoticePage(i18n))
  }

  async salesTerms({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/sales_terms', this.content.salesTermsPage(i18n))
  }

  async simulator({ inertia, auth }: HttpContext) {
    const isAuthenticated = await auth.check()
    let canAddBoat = true
    if (isAuthenticated) {
      const user = auth.getUserOrFail()
      await user.load('organization')
      canAddBoat = user.organization ? await this.quotaService.canAddBoat(user.organization) : false
    }
    const benchmarks = await this.simulatorLeadService.getBenchmarks()
    return inertia.render('marketing/simulator', { isAuthenticated, canAddBoat, benchmarks })
  }
}
