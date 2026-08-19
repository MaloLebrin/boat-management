import { test } from '@japa/runner'

/**
 * Guide entretien (#476) : le titre SEO portait « 2025 » en dur dans les deux
 * locales et datait la page dans les SERP. L'année est désormais interpolée
 * côté contrôleur à partir de la date courante.
 */
interface GuideProps {
  meta: { title: string; description: string }
  guide: { hero: { title: string } }
}

const GUIDE_URLS = { fr: '/fr/cout-entretien-bateau', en: '/en/boat-maintenance-cost' } as const

test.group('Guide entretien — titre SEO (#476)', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] le titre SEO porte l'année en cours`, async ({ client, assert }) => {
      const response = await client.get(GUIDE_URLS[locale]).withInertia()

      response.assertStatus(200)
      assert.equal(response.body().component, 'marketing/guide')

      const props = response.body().props as unknown as GuideProps
      const currentYear = String(new Date().getFullYear())

      assert.include(props.meta.title, currentYear)
      // Le placeholder ICU doit être résolu, jamais rendu tel quel.
      assert.notInclude(props.meta.title, '{year}')
      // Aucune clé de traduction non résolue.
      assert.notInclude(props.meta.title, 'marketing.guide')
      assert.isNotEmpty(props.meta.description)
    })

    test(`[${locale}] le titre SEO ne contient aucune année figée`, async ({ client, assert }) => {
      const response = await client.get(GUIDE_URLS[locale]).withInertia()

      const props = response.body().props as unknown as GuideProps
      const currentYear = new Date().getFullYear()
      const years = props.meta.title.match(/\b(19|20)\d{2}\b/g) ?? []

      assert.isNotEmpty(years)
      for (const year of years) {
        assert.equal(Number(year), currentYear)
      }
    })
  }
})
