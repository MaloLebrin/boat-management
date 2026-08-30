import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import type { PricingTableRow } from '#shared/types/marketing'
import { marketingPath } from '#shared/helpers/locale_path'
import { PUBLIC_DIAGNOSIS_LIFETIME_LIMIT } from '#shared/types/public_diagnosis'

interface HomeProps {
  t: {
    home: {
      diagnosis: {
        title: string
        subtitle: string
        items: string[]
        ctaLabel: string
        ctaHref: string
        note: string
        disclaimer: string
      }
    }
  }
}

interface PricingProps {
  t: {
    pricing: {
      tiers: Array<{ name: string; feats: Array<[string, string?]> }>
      detailedTable: { groups: Array<{ title: string; rows: PricingTableRow[] }> }
      faq: { items: Array<{ q: string; a: string }> }
    }
  }
}

async function fetchProps<T>(client: ApiClient, path: string): Promise<T> {
  const response = await client.get(path).withInertia()
  response.assertStatus(200)
  return response.body().props as T
}

/**
 * #609 — la page publique de diagnostic IA n'était reliée au site que par le
 * footer et le sitemap. Ces tests verrouillent sa mise en avant : section
 * dédiée sur la home, argumentaire sur la page tarifs, et un quota affiché qui
 * vient de la constante et non d'un nombre recopié dans les traductions.
 */
test.group('Diagnostic IA public — mise en avant marketing (#609)', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] la home expose une section diagnostic qui pointe vers le chat public`, async ({
      client,
      assert,
    }) => {
      const props = await fetchProps<HomeProps>(client, marketingPath('home', locale))
      const { diagnosis } = props.t.home

      assert.equal(diagnosis.ctaHref, marketingPath('diagnosisAi', locale))
      assert.lengthOf(diagnosis.items, 3)
      for (const field of [
        diagnosis.title,
        diagnosis.subtitle,
        diagnosis.ctaLabel,
        diagnosis.disclaimer,
      ]) {
        assert.isNotEmpty(field)
      }
    })

    test(`[${locale}] la home annonce le nombre réel de diagnostics offerts`, async ({
      client,
      assert,
    }) => {
      const props = await fetchProps<HomeProps>(client, marketingPath('home', locale))

      assert.include(props.t.home.diagnosis.note, String(PUBLIC_DIAGNOSIS_LIFETIME_LIMIT))
      // Le libellé doit être interpolé, pas rendu avec son placeholder brut.
      assert.notInclude(props.t.home.diagnosis.note, '{count}')
    })

    test(`[${locale}] le tiers Starter cite les diagnostics IA gratuits`, async ({
      client,
      assert,
    }) => {
      const props = await fetchProps<PricingProps>(client, marketingPath('pricing', locale))
      const starter = props.t.pricing.tiers[0]
      const feats = starter.feats.map(([label]) => label).join(' ')

      assert.include(feats, String(PUBLIC_DIAGNOSIS_LIFETIME_LIMIT))
      assert.notInclude(feats, '{count}')
    })

    test(`[${locale}] le comparatif distingue le quota Starter du sans-plafond Pro/Entreprise`, async ({
      client,
      assert,
    }) => {
      const props = await fetchProps<PricingProps>(client, marketingPath('pricing', locale))
      const label = locale === 'fr' ? 'Diagnostic de panne public' : 'Public breakdown diagnosis'
      const row = props.t.pricing.detailedTable.groups
        .flatMap((group) => group.rows)
        .find((r) => r[0] === label)

      assert.isDefined(row, `ligne « ${label} » introuvable dans le comparatif`)
      assert.include(String(row![1]), String(PUBLIC_DIAGNOSIS_LIFETIME_LIMIT))
      // Pro et Entreprise n'ont pas de plafond de conversations : leur cellule
      // ne doit donc pas répéter le quota « à vie » du Starter.
      assert.notEqual(row![2], row![1])
      assert.equal(row![3], row![2])
    })

    test(`[${locale}] la FAQ tarifs répond à « essayer l'IA sans compte »`, async ({
      client,
      assert,
    }) => {
      const props = await fetchProps<PricingProps>(client, marketingPath('pricing', locale))
      const answers = props.t.pricing.faq.items.map((item) => item.a)

      assert.isTrue(
        answers.some((a) => a.includes(String(PUBLIC_DIAGNOSIS_LIFETIME_LIMIT))),
        'aucune réponse de la FAQ ne cite le nombre de diagnostics gratuits'
      )
      for (const answer of answers) {
        assert.notInclude(answer, '{count}')
      }
    })
  }
})
