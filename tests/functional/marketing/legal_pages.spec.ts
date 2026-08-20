import { test } from '@japa/runner'
import type { LegalDocument } from '#shared/types/marketing'

/**
 * Mentions légales et CGV (#466) : le footer n'exposait plus aucun lien légal
 * depuis le retrait du lien mort « Conditions » (#413), alors que la LCEN et le
 * code de la consommation les imposent à un SaaS payant opéré en France.
 */
interface LegalNoticeProps {
  meta: { title: string; description: string }
  legalNotice: LegalDocument
}

interface SalesTermsProps {
  meta: { title: string; description: string }
  salesTerms: LegalDocument
}

const LEGAL_NOTICE_URLS = { fr: '/fr/mentions-legales', en: '/en/legal-notice' } as const
const SALES_TERMS_URLS = { fr: '/fr/cgv', en: '/en/sales-terms' } as const

function assertNoRawKeys(
  document: LegalDocument,
  namespace: string,
  assert: { notInclude: (a: string, b: string) => void; isNotEmpty: (v: unknown) => void }
) {
  for (const section of document.sections) {
    assert.notInclude(section.title, namespace)
    assert.notInclude(section.body, namespace)
    assert.isNotEmpty(section.body)
    for (const bullet of section.bullets ?? []) {
      assert.notInclude(bullet, namespace)
    }
    for (const entry of section.entries ?? []) {
      assert.notInclude(entry.label, namespace)
      assert.isNotEmpty(entry.label)
      // Une valeur d'environnement absente doit rester lisible, jamais vide.
      assert.isNotEmpty(entry.value)
    }
  }
}

test.group('Mentions légales (#466)', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] la page répond et rend l'identité de l'éditeur`, async ({
      client,
      assert,
    }) => {
      const response = await client.get(LEGAL_NOTICE_URLS[locale]).withInertia()

      response.assertStatus(200)
      assert.equal(response.body().component, 'marketing/legal_notice')

      const props = response.body().props as unknown as LegalNoticeProps
      assert.isNotEmpty(props.meta.title)
      assert.isNotEmpty(props.meta.description)
      assert.isNotEmpty(props.legalNotice.hero.title)
      assert.isAbove(props.legalNotice.sections.length, 5)
      assert.include(props.legalNotice.contact.email, '@')

      assertNoRawKeys(props.legalNotice, 'marketing.legalNotice.', assert)
    })

    test(`[${locale}] les mentions obligatoires LCEN sont présentes`, async ({
      client,
      assert,
    }) => {
      const response = await client.get(LEGAL_NOTICE_URLS[locale]).withInertia()
      const props = response.body().props as unknown as LegalNoticeProps

      // Éditeur, directeur de la publication, hébergeur : les trois blocs
      // d'identité exigés par l'article 6-III de la LCEN.
      const sectionsWithEntries = props.legalNotice.sections.filter((s) => s.entries?.length)
      assert.isAtLeast(sectionsWithEntries.length, 3)

      const publisher = props.legalNotice.sections[0]
      assert.lengthOf(publisher.entries ?? [], 8)
    })
  }

  test('les mentions légales sont référencées dans le sitemap dans les deux locales', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/sitemap.xml')

    response.assertStatus(200)
    assert.include(response.text(), '<loc>https://fleetai.app/fr/mentions-legales</loc>')
    assert.include(response.text(), '<loc>https://fleetai.app/en/legal-notice</loc>')
  })
})

test.group('CGV / Sales terms (#466)', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] la page répond et rend un document de vente complet`, async ({
      client,
      assert,
    }) => {
      const response = await client.get(SALES_TERMS_URLS[locale]).withInertia()

      response.assertStatus(200)
      assert.equal(response.body().component, 'marketing/sales_terms')

      const props = response.body().props as unknown as SalesTermsProps
      assert.isNotEmpty(props.meta.title)
      assert.isNotEmpty(props.meta.description)
      assert.isNotEmpty(props.salesTerms.hero.title)
      assert.isNotEmpty(props.salesTerms.hero.updatedDate)
      assert.isAbove(props.salesTerms.sections.length, 10)
      assert.include(props.salesTerms.contact.email, '@')

      assertNoRawKeys(props.salesTerms, 'marketing.salesTerms.', assert)
    })
  }

  test('les CGV couvrent les clauses obligatoires d’une vente à distance (FR)', async ({
    client,
    assert,
  }) => {
    const response = await client.get(SALES_TERMS_URLS.fr).withInertia()
    const props = response.body().props as unknown as SalesTermsProps
    const text = props.salesTerms.sections
      .map((s) => `${s.title} ${s.body} ${(s.bullets ?? []).join(' ')}`)
      .join(' ')
      .toLowerCase()

    for (const clause of [
      'prix',
      'paiement',
      'reconduction',
      'rétractation',
      'résiliation',
      'médiat',
      'droit français',
    ]) {
      assert.include(text, clause)
    }
  })

  test('les CGV sont référencées dans le sitemap dans les deux locales', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/sitemap.xml')

    response.assertStatus(200)
    assert.include(response.text(), '<loc>https://fleetai.app/fr/cgv</loc>')
    assert.include(response.text(), '<loc>https://fleetai.app/en/sales-terms</loc>')
  })
})
