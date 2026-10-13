import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import BoatMaintenanceSheetItem from '#models/boat_maintenance_sheet_item'
import { BoatMaintenanceSheetFactory } from '#database/factories/boat_maintenance_sheet_factory'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createBoatForUser } from '#tests/browser/helpers'
import type { Page } from 'playwright'

/**
 * Retour à quai après une longue coupure : plusieurs conflits d'un coup (#970).
 *
 * Les moitiés sont prouvées ailleurs — la file qui met les conflits de côté et
 * les tranche en lot en Vitest (`use_offline_queue`, `conflict_resolution_modal`),
 * les verrous côté serveur en fonctionnel (`offline_conflict_payload`,
 * `incident_conflict`). Ce test prouve le raccord : saisies hors-ligne →
 * retour du réseau → la file passe les conflits et envoie le reste → une seule
 * modale les liste, groupés par bateau → arbitrage un par un puis « partout »
 * → base.
 *
 * Décor : les items d'une fiche d'entretien, verrouillés depuis #490 — quatre
 * cases à cocher sur un seul écran donnent quatre actions indépendantes.
 *
 * ⚠️ Comme `offline_queue.spec.ts` : ne jamais naviguer pendant la coupure, le
 * service worker est désactivé sous test.
 */

const LABELS = ['Vidange', 'Filtre à gasoil', 'Anode', 'Turbine'] as const

function itemRow(page: Page, label: string) {
  return page.locator('div.rounded-lg.border.p-3').filter({ hasText: label })
}

/** Le quai touche l'item pendant la coupure : son `updatedAt` avance. */
async function editedAshore(item: BoatMaintenanceSheetItem) {
  item.notes = 'vu au quai'
  item.updatedAt = DateTime.now().plus({ minutes: 5 })
  await item.save()
}

test.group('E2E · Offline conflicts in batch', (group) => {
  group.each.setup(() => truncateDb())

  test('a long outage surfaces every conflict in one list, resolved one by one then everywhere', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await createBoatForUser(user, { name: 'Offline Ketch' })
    const sheet = await BoatMaintenanceSheetFactory.merge({
      boatId: boat.id,
      status: 'in_progress',
      type: 'entretien',
    }).create()
    const items = await BoatMaintenanceSheetItem.createMany(
      LABELS.map((label, index) => ({
        boatMaintenanceSheetId: sheet.id,
        position: index + 1,
        label,
        isDone: false,
        notes: null,
      }))
    )
    await browserContext.loginAs(user)

    const page = await visit(`/boats/${boat.id}?tab=sheets`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'View steps' }).click()
    await itemRow(page, LABELS[0]).waitFor()

    await browserContext.setOffline(true)
    for (const label of LABELS) {
      await itemRow(page, label).getByRole('button').first().click()
    }
    await page.locator('[data-test="queue-group"]').first().waitFor()

    const [first, second, third, untouched] = items
    for (const item of [first, second, third]) await editedAshore(item)

    await browserContext.setOffline(false)

    // Une seule modale pour les trois conflits ; l'item sans conflit est déjà
    // passé, il n'attend pas l'arbitrage.
    const dialog = page.getByRole('dialog', { name: 'Conflict detected' })
    await dialog.waitFor()
    await page.getByText('Sync finished: 1 sent, 0 rejected, 3 in conflict').waitFor()
    const boatGroup = dialog.getByRole('region', {
      name: 'Offline Ketch · Maintenance sheet item',
    })
    assert.lengthOf(await boatGroup.locator('[data-testid="conflict-item"]').all(), 3)
    await untouched.refresh()
    assert.isTrue(untouched.isDone)

    // Arbitrage d'un seul conflit : les deux autres restent à trancher.
    await dialog
      .locator('[data-testid="conflict-item"]')
      .first()
      .getByRole('button', { name: 'Use server version' })
      .click()
    await dialog.locator('[data-testid="conflict-item"]').nth(2).waitFor({ state: 'detached' })
    assert.lengthOf(await dialog.locator('[data-testid="conflict-item"]').all(), 2)

    // Puis tout le reste d'un coup : chaque version locale repart avec son
    // nouveau jeton et franchit le verrou.
    await dialog.getByRole('button', { name: 'Keep my changes everywhere' }).click()
    await dialog.waitFor({ state: 'detached' })
    await page.locator('[data-test="queue-group"]').first().waitFor({ state: 'detached' })

    const fresh = await BoatMaintenanceSheetItem.query()
      .where('boatMaintenanceSheetId', sheet.id)
      .orderBy('position')
    assert.deepEqual(
      fresh.map((item) => [item.label, item.isDone]),
      [
        ['Vidange', false],
        ['Filtre à gasoil', true],
        ['Anode', true],
        ['Turbine', true],
      ]
    )
  })
})
