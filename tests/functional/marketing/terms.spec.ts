import { test } from '@japa/runner'
import type { LegalDocument } from '#shared/types/marketing'

/**
 * Les CGU référencées par la case à cocher du signup n'existaient pas (#455) :
 * le lien pointait sur `href="#"`. Cette page les publie dans les deux locales.
 */
interface TermsProps {
  meta: { title: string; description: string }
  terms: LegalDocument
}

const URLS = { fr: '/fr/cgu', en: '/en/terms' } as const

test.group('CGU / Terms of service (#455)', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] la page répond et rend un document légal complet`, async ({
      client,
      assert,
    }) => {
      const response = await client.get(URLS[locale]).withInertia()

      response.assertStatus(200)
      const props = response.body().props as unknown as TermsProps

      assert.isNotEmpty(props.meta.title)
      assert.isNotEmpty(props.meta.description)
      assert.isNotEmpty(props.terms.hero.title)
      assert.isNotEmpty(props.terms.hero.updatedDate)
      assert.isAbove(props.terms.sections.length, 5)
      assert.include(props.terms.contact.email, '@')

      // Une clé i18n manquante remonterait telle quelle (`marketing.terms.s1_title`).
      for (const section of props.terms.sections) {
        assert.notInclude(section.title, 'marketing.terms.')
        assert.notInclude(section.body, 'marketing.terms.')
        assert.isNotEmpty(section.body)
        for (const bullet of section.bullets ?? []) {
          assert.notInclude(bullet, 'marketing.terms.')
        }
      }
    })

    test(`[${locale}] la page est rendue par le composant terms`, async ({ client, assert }) => {
      const response = await client.get(URLS[locale]).withInertia()

      assert.equal(response.body().component, 'marketing/terms')
    })
  }

  test('les CGU sont référencées dans le sitemap dans les deux locales', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/sitemap.xml')

    response.assertStatus(200)
    assert.include(response.text(), '<loc>https://fleetai.app/fr/cgu</loc>')
    assert.include(response.text(), '<loc>https://fleetai.app/en/terms</loc>')
  })
})
