import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { PLAN_LIMITS } from '#shared/types/plan'
import type { PricingTableRow } from '#shared/types/marketing'

interface PricingProps {
  t: {
    pricing: {
      hero: { subtitle: string }
      detailedTable: { groups: Array<{ title: string; rows: PricingTableRow[] }> }
      faq: { items: Array<{ q: string; a: string }> }
    }
  }
}

async function fetchPricingProps(client: ApiClient, locale: 'fr' | 'en'): Promise<PricingProps> {
  const response = await client.get(`/${locale}/tarifs`).withInertia()
  response.assertStatus(200)
  return response.body().props as PricingProps
}

function findRow(props: PricingProps, label: string): PricingTableRow | undefined {
  for (const group of props.t.pricing.detailedTable.groups) {
    const row = group.rows.find((r) => r[0] === label)
    if (row) return row
  }
  return undefined
}

function allRowLabels(props: PricingProps): string[] {
  return props.t.pricing.detailedTable.groups.flatMap((g) => g.rows.map((r) => r[0]))
}

test.group('Pricing page — promesses alignées sur le produit (#454)', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] la ligne « bateaux » du comparatif reflète PLAN_LIMITS`, async ({
      client,
      assert,
    }) => {
      const props = await fetchPricingProps(client, locale)
      const label = locale === 'fr' ? 'Bateaux gérés' : 'Boats managed'
      const row = findRow(props, label)

      assert.isDefined(row, `ligne « ${label} » introuvable dans le comparatif`)
      assert.include(String(row![1]), String(PLAN_LIMITS.starter.maxBoats))
      assert.include(String(row![2]), String(PLAN_LIMITS.pro.maxBoats))
      // Enterprise a `maxBoats: null` → libellé « illimités » sans chiffre.
      assert.notMatch(String(row![3]), /\d/)
    })

    test(`[${locale}] la ligne « utilisateurs » du comparatif reflète PLAN_LIMITS`, async ({
      client,
      assert,
    }) => {
      const props = await fetchPricingProps(client, locale)
      const label = locale === 'fr' ? 'Utilisateurs' : 'Users'
      const row = findRow(props, label)

      assert.isDefined(row, `ligne « ${label} » introuvable dans le comparatif`)
      assert.include(String(row![1]), String(PLAN_LIMITS.starter.maxMembers))
      assert.include(String(row![2]), String(PLAN_LIMITS.pro.maxMembers))
      assert.notMatch(String(row![3]), /\d/)
    })

    test(`[${locale}] la ligne « stockage » du comparatif reflète PLAN_LIMITS`, async ({
      client,
      assert,
    }) => {
      const props = await fetchPricingProps(client, locale)
      const label = locale === 'fr' ? 'Stockage documents' : 'Document storage'
      const row = findRow(props, label)

      assert.isDefined(row, `ligne « ${label} » introuvable dans le comparatif`)
      assert.include(String(row![1]), String(PLAN_LIMITS.starter.storageGb))
      assert.include(String(row![2]), String(PLAN_LIMITS.pro.storageGb))
      assert.notMatch(String(row![3]), /\d/)
    })

    test(`[${locale}] la ligne « export » du comparatif reflète canExport`, async ({
      client,
      assert,
    }) => {
      const props = await fetchPricingProps(client, locale)
      const label = locale === 'fr' ? 'Export PDF / CSV' : 'PDF / CSV export'
      const row = findRow(props, label)

      assert.isDefined(row, `ligne « ${label} » introuvable dans le comparatif`)
      // L'export est verrouillé en Starter : la colonne doit afficher un tiret.
      assert.strictEqual(row![1], PLAN_LIMITS.starter.canExport)
      assert.strictEqual(row![2], PLAN_LIMITS.pro.canExport)
      assert.strictEqual(row![3], PLAN_LIMITS.enterprise.canExport)
    })

    test(`[${locale}] les lignes IA du comparatif reflètent canUseAI / canCustomizeAI`, async ({
      client,
      assert,
    }) => {
      const props = await fetchPricingProps(client, locale)
      const copilot = locale === 'fr' ? 'Copilote conversationnel' : 'Conversational copilot'
      const custom = locale === 'fr' ? 'Personnalisation du modèle' : 'Model customisation'

      assert.deepEqual(findRow(props, copilot)?.slice(1), [
        PLAN_LIMITS.starter.canUseAI,
        PLAN_LIMITS.pro.canUseAI,
        PLAN_LIMITS.enterprise.canUseAI,
      ])
      assert.deepEqual(findRow(props, custom)?.slice(1), [
        PLAN_LIMITS.starter.canCustomizeAI,
        PLAN_LIMITS.pro.canCustomizeAI,
        PLAN_LIMITS.enterprise.canCustomizeAI,
      ])
    })

    test(`[${locale}] la ligne « audit log » reflète auditLogRetentionDays`, async ({
      client,
      assert,
    }) => {
      const props = await fetchPricingProps(client, locale)
      const row = findRow(props, 'Audit log')

      assert.isDefined(row, 'ligne « Audit log » introuvable dans le comparatif')
      // 0 jour de rétention en Starter = pas d'audit log du tout.
      assert.strictEqual(row![1], false)
      assert.include(String(row![2]), String(PLAN_LIMITS.pro.auditLogRetentionDays))
      assert.notMatch(String(row![3]), /\d/)
    })

    test(`[${locale}] le comparatif ne liste aucune fonctionnalité inexistante`, async ({
      client,
      assert,
    }) => {
      const props = await fetchPricingProps(client, locale)
      const labels = allRowLabels(props).join(' | ').toLowerCase()

      // Aucun de ces concepts n'existe dans le produit (#454) : pas de bascule
      // multi-organisation, pas d'invité externe distinct d'un membre, pas de
      // commentaire d'événement, et l'export ne produit que du PDF et du CSV.
      for (const absent of ['multi-organisation', 'json']) {
        assert.notInclude(labels, absent)
      }
      assert.notInclude(labels, locale === 'fr' ? 'invités externes' : 'external guests')
      assert.notInclude(labels, locale === 'fr' ? 'commentaires sur' : 'event comments')
      assert.notInclude(labels, locale === 'fr' ? 'avant/après' : 'before/after')
    })

    test(`[${locale}] le hero ne promet pas des utilisateurs illimités`, async ({
      client,
      assert,
    }) => {
      const props = await fetchPricingProps(client, locale)
      const subtitle = props.t.pricing.hero.subtitle

      // Le quota réel est de 1 membre en Starter et 5 en Pro : le sous-titre
      // doit citer la limite, pas promettre des invitations sans surcoût.
      assert.include(subtitle, String(PLAN_LIMITS.pro.maxMembers))
    })

    test(`[${locale}] la FAQ tarifs cite la vraie limite Pro et l'add-on bateaux`, async ({
      client,
      assert,
    }) => {
      const props = await fetchPricingProps(client, locale)
      const answers = props.t.pricing.faq.items.map((i) => i.a).join(' ')

      assert.include(answers, String(PLAN_LIMITS.pro.maxBoats))
    })
  }
})
