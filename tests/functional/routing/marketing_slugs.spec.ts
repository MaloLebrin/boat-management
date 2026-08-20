import { test } from '@japa/runner'
import {
  APP_LOCALES,
  MARKETING_SLUGS,
  marketingPath,
  type MarketingPage,
} from '#shared/helpers/locale_path'

const MARKETING_PAGES = Object.keys(MARKETING_SLUGS) as MarketingPage[]

/**
 * `MARKETING_SLUGS` pilote les liens internes, les canonical/hreflang, le
 * sitemap et le sélecteur de langue (#475) : un slug qui dérive de
 * `start/routes/marketing.ts` produit un 404 silencieux sur chacun d'eux.
 */
test.group('Marketing slugs (#475)', () => {
  for (const page of MARKETING_PAGES) {
    for (const locale of APP_LOCALES) {
      const path = marketingPath(page, locale)

      test(`${path} is served (${page}, ${locale})`, async ({ client }) => {
        const response = await client.get(path)

        response.assertStatus(200)
      })
    }
  }
})
