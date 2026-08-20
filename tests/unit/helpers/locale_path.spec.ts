import { test } from '@japa/runner'
import {
  APP_LOCALES,
  MARKETING_SLUGS,
  buildLocaleSwitchHref,
  hasLocalePathPrefix,
  marketingPath,
  stripLocalePathPrefix,
  type MarketingPage,
} from '#shared/helpers/locale_path'

test.group('locale_path', () => {
  test('does not strip arbitrary two-letter segments from /login', ({ assert }) => {
    assert.equal(stripLocalePathPrefix('/login'), '/login')
    assert.isFalse(hasLocalePathPrefix('/login'))
    assert.isNull(buildLocaleSwitchHref('/login', 'fr'))
  })

  test('builds the marketing path of each page per locale', ({ assert }) => {
    assert.equal(marketingPath('pricing', 'en'), '/en/pricing')
    assert.equal(marketingPath('pricing', 'fr'), '/fr/tarifs')
    assert.equal(marketingPath('simulator', 'en'), '/en/maintenance-cost-simulator')
    assert.equal(marketingPath('guide', 'fr'), '/fr/cout-entretien-bateau')
    assert.equal(marketingPath('legalNotice', 'fr'), '/fr/mentions-legales')
    assert.equal(marketingPath('home', 'en'), '/en')
    assert.equal(marketingPath('home', 'fr'), '/fr')
  })

  /**
   * Le sélecteur de langue est le seul écran qui traduit une URL déjà servie :
   * une page dont le slug diffère et qui manque à `MARKETING_SLUGS` y renvoie
   * un 404 silencieux (#475). Ce test couvre donc tout le catalogue.
   */
  test('switches locale for every marketing page, in both directions', ({ assert }) => {
    for (const page of Object.keys(MARKETING_SLUGS) as MarketingPage[]) {
      for (const from of APP_LOCALES) {
        const to = from === 'en' ? 'fr' : 'en'
        assert.equal(
          buildLocaleSwitchHref(marketingPath(page, from), to),
          marketingPath(page, to),
          `${page}: ${from} → ${to}`
        )
      }
    }
  })

  test('maps the legacy /en/tarifs slug to the French pricing page (#475)', ({ assert }) => {
    // Tant que la redirection 301 existe, l'ancien slug EN reste traduisible.
    assert.equal(buildLocaleSwitchHref('/en/tarifs', 'fr'), '/fr/tarifs')
  })

  test('leaves an unknown suffix untouched', ({ assert }) => {
    assert.equal(buildLocaleSwitchHref('/en/unknown-page', 'fr'), '/fr/unknown-page')
  })
})
