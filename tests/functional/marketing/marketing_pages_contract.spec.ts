import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { SimulatorShareFactory } from '#database/factories/simulator_share_factory'
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Contrat des pages marketing (#689).
 *
 * Ces pages sont les seules du dépôt à déclarer leurs props via un **type
 * nommé** (`defineProps<MarketingHomeProps>()`) plutôt qu'un littéral inline :
 * le parseur de `tests/support/inertia_page.ts` ne sait pas les résoudre, et il
 * lève plutôt que de rendre une liste vide. D'où `{ derive: false }` sur ces
 * pages-là : leurs props sont déjà figées, et bien plus strictement, par les
 * snapshots par locale de `props_snapshot.spec.ts` (`assert.deepEqual` sur
 * l'objet entier). Ici on ajoute ce qui manquait : **quelle page** est servie.
 *
 * Trois pages échappent à cette règle et gardent la dérivation : `diagnosis_ai`
 * et `parts_ai` déclarent un littéral inline, `simulator` ne déclare rien.
 *
 * ⚠️ `marketing/feature` est rendue par **trois** routes avec trois payloads
 * (`maintenance`, `fleet`, `aiAssistant`). Épingler le composant ne les
 * distingue pas — les trois sont couvertes ici, mais c'est le contrat de page
 * qui est figé, pas le contenu de chaque variante.
 */

const NAMED_TYPE = { derive: false } as const

test.group('Marketing pages contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /en renders marketing/home', async ({ client, assert }) => {
    assertPageContract(assert, await client.get('/en').withInertia(), 'marketing/home', NAMED_TYPE)
  })

  test('GET /en/pricing renders marketing/pricing', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/pricing').withInertia(),
      'marketing/pricing',
      NAMED_TYPE
    )
  })

  test('GET /en/about renders marketing/about', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/about').withInertia(),
      'marketing/about',
      NAMED_TYPE
    )
  })

  test('GET /en/contact renders marketing/contact', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/contact').withInertia(),
      'marketing/contact',
      NAMED_TYPE
    )
  })

  test('GET /en/help renders marketing/help', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/help').withInertia(),
      'marketing/help',
      NAMED_TYPE
    )
  })

  test('GET /en/boat-maintenance-cost renders marketing/guide', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/boat-maintenance-cost').withInertia(),
      'marketing/guide',
      NAMED_TYPE
    )
  })

  test('GET /en/privacy renders marketing/privacy', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/privacy').withInertia(),
      'marketing/privacy',
      NAMED_TYPE
    )
  })

  test('GET /en/terms renders marketing/terms', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/terms').withInertia(),
      'marketing/terms',
      NAMED_TYPE
    )
  })

  test('GET /en/sales-terms renders marketing/sales_terms', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/sales-terms').withInertia(),
      'marketing/sales_terms',
      NAMED_TYPE
    )
  })

  test('GET /en/legal-notice renders marketing/legal_notice', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/legal-notice').withInertia(),
      'marketing/legal_notice',
      NAMED_TYPE
    )
  })

  // --- les trois routes qui partagent le composant `marketing/feature` ---

  test('GET /en/boat-maintenance-log renders marketing/feature', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/boat-maintenance-log').withInertia(),
      'marketing/feature',
      NAMED_TYPE
    )
  })

  test('GET /en/boat-fleet-management renders marketing/feature', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/boat-fleet-management').withInertia(),
      'marketing/feature',
      NAMED_TYPE
    )
  })

  test('GET /en/ai-boat-assistant renders marketing/feature', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/ai-boat-assistant').withInertia(),
      'marketing/feature',
      NAMED_TYPE
    )
  })

  // --- les pages dont le contrat de props est dérivable ---

  test('GET /en/maintenance-cost-simulator renders marketing/simulator', async ({
    client,
    assert,
  }) => {
    assertPageContract(
      assert,
      await client.get('/en/maintenance-cost-simulator').withInertia(),
      'marketing/simulator'
    )
  })

  test('GET /en/engine-diagnosis-ai renders marketing/diagnosis_ai', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/engine-diagnosis-ai').withInertia(),
      'marketing/diagnosis_ai'
    )
  })

  test('GET /en/engine-part-finder-ai renders marketing/parts_ai', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/en/engine-part-finder-ai').withInertia(),
      'marketing/parts_ai'
    )
  })

  test('GET a share link renders marketing/simulator_share', async ({ client, assert }) => {
    const share = await SimulatorShareFactory.merge({ locale: 'en' }).create()

    assertPageContract(
      assert,
      await client.get(`/simulator/r/${share.token}`).withInertia(),
      'marketing/simulator_share',
      NAMED_TYPE
    )
  })
})
